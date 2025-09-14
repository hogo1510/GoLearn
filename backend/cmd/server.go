package cmd

import (
	"backend/ai/poc"
	"backend/converter"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
)

// CORS middleware voor http.HandlerFunc
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func getRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got / request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	io.WriteString(w, `{"message": "main site", "status": "ok"}`)
}

func getExams(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getExams request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	type Exam struct {
		ID           int    `json:"id"`
		Name         string `json:"name"`
		Beschrijving string `json:"beschrijving,omitempty"`
		AantalVragen int    `json:"aantalVragen,omitempty"`
		Niveau       string `json:"niveau,omitempty"`
		Categorie    string `json:"categorie,omitempty"`
	}

	entries, err := os.ReadDir("converter/dataXML")
	if err != nil {
		fmt.Printf("Fout bij lezen directory: %v\n", err)
		http.Error(w, "Fout bij lezen directory: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Maak examens van directory entries
	examens := make([]Exam, 0)
	for i, e := range entries {
		if e.IsDir() {
			// Probeer vragen te tellen voor dit examen
			xmlDataDir := fmt.Sprintf("converter/dataXML/%s", e.Name())
			vragen, err := converter.XmlConverterVragenOnly(xmlDataDir)
			aantalVragen := 0
			if err == nil {
				aantalVragen = len(vragen)
			}

			examens = append(examens, Exam{
				ID:           i + 1,
				Name:         e.Name(),
				Beschrijving: "Test je kennis over dit onderwerp",
				AantalVragen: aantalVragen,
				Niveau:       "Alle niveaus",
				Categorie:    determineCategory(e.Name()),
			})
		}
	}

	jsonData, err := json.Marshal(examens)
	if err != nil {
		http.Error(w, "Fout bij converteren naar JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

// Bepaal categorie op basis van examen naam
func determineCategory(naam string) string {
	switch {
	case contains(naam, "methodiek"):
		return "methodiek"
	case contains(naam, "recht"):
		return "recht"
	case contains(naam, "psychologie"):
		return "psychologie"
	case contains(naam, "sociologie"):
		return "sociologie"
	case contains(naam, "agogiek"):
		return "agogiek"
	case contains(naam, "communicatie"):
		return "communicatie"
	case contains(naam, "onderzoek"):
		return "onderzoek"
	case contains(naam, "beleid"):
		return "beleid"
	case contains(naam, "zorg"):
		return "zorg"
	case contains(naam, "jeugd"):
		return "jeugd"
	case contains(naam, "welzijn"):
		return "welzijn"
	case contains(naam, "diversiteit"):
		return "diversiteit"
	case contains(naam, "beroepsethiek"):
		return "recht"
	default:
		return "algemeen"
	}
}

// Helper functie voor case-insensitive string matching
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s[:len(substr)] == substr ||
		fmt.Sprintf("%s", s) != s) // Simpele check, kan uitgebreid worden
}

func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Haal examenId uit query parameters
	examenIdStr := r.URL.Query().Get("examenId")
	var xmlDataDir string

	if examenIdStr != "" {
		examenId, err := strconv.Atoi(examenIdStr)
		if err != nil {
			http.Error(w, "Ongeldige examenId: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Haal directory naam op basis van examenId
		entries, err := os.ReadDir("converter/dataXML")
		if err != nil {
			http.Error(w, "Fout bij lezen directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		dirIndex := 0
		for _, e := range entries {
			if e.IsDir() {
				dirIndex++
				if dirIndex == examenId {
					xmlDataDir = fmt.Sprintf("converter/dataXML/%s", e.Name())
					break
				}
			}
		}

		if xmlDataDir == "" {
			http.Error(w, "Examen niet gevonden", http.StatusNotFound)
			return
		}
	} else {
		// Default fallback
		xmlDataDir = "converter/dataXML/Sociaal-werk_Beroepsethiek_1"
	}

	// Controleer of de directory bestaat
	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	// Probeer vragen te laden met betere error handling
	vragen, err := converter.XmlConverterVragenOnly(xmlDataDir)
	if err != nil {
		// Log de fout maar probeer door te gaan
		fmt.Printf("Waarschuwing bij XML parsing: %v\n", err)

		// Probeer een alternatieve methode of return lege lijst met waarschuwing
		if len(vragen) == 0 {
			errorMsg := fmt.Sprintf("Fout bij verwerken XML bestanden: %v", err)
			fmt.Println(errorMsg)
			http.Error(w, errorMsg, http.StatusInternalServerError)
			return
		}
	}

	// Filter out vragen zonder content
	filteredVragen := make([]interface{}, 0)
	for _, vraag := range vragen {
		// Dit hangt af van de structuur van je vragen
		// Je zou hier kunnen controleren op lege tekst, etc.
		filteredVragen = append(filteredVragen, vraag)
	}

	fmt.Printf("Aantal vragen geladen: %d (gefilterd: %d)\n", len(vragen), len(filteredVragen))

	jsonData, err := json.Marshal(filteredVragen)
	if err != nil {
		http.Error(w, "Fout bij converteren naar JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

func getAntwoorden(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAntwoorden request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Haal examenId uit query parameters
	examenIdStr := r.URL.Query().Get("examenId")
	var xmlDataDir string

	if examenIdStr != "" {
		examenId, err := strconv.Atoi(examenIdStr)
		if err != nil {
			http.Error(w, "Ongeldige examenId: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Haal directory naam op basis van examenId
		entries, err := os.ReadDir("converter/dataXML")
		if err != nil {
			http.Error(w, "Fout bij lezen directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		dirIndex := 0
		for _, e := range entries {
			if e.IsDir() {
				dirIndex++
				if dirIndex == examenId {
					xmlDataDir = fmt.Sprintf("converter/dataXML/%s", e.Name())
					break
				}
			}
		}

		if xmlDataDir == "" {
			http.Error(w, "Examen niet gevonden", http.StatusNotFound)
			return
		}
	} else {
		// Default fallback
		xmlDataDir = "converter/dataXML/Sociaal-werk_Beroepsethiek_1"
	}

	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	antwoorden, err := converter.XmlConverterAntwoordenOnly(xmlDataDir)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij verwerken XML bestanden: %v", err)
		fmt.Println(errorMsg)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	fmt.Printf("Aantal antwoorden geladen: %d\n", len(antwoorden))

	jsonData, err := json.Marshal(antwoorden)
	if err != nil {
		http.Error(w, "Fout bij converteren naar JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

func getAiHelp(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAiHelp request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != "POST" {
		http.Error(w, "Alleen POST requests zijn toegestaan", http.StatusMethodNotAllowed)
		return
	}

	var requestData struct {
		Vraag string `json:"vraag"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		http.Error(w, "Ongeldige JSON in request body", http.StatusBadRequest)
		return
	}

	if requestData.Vraag == "" {
		http.Error(w, "Vraag mag niet leeg zijn", http.StatusBadRequest)
		return
	}

	uitleg, err := poc.GetChatExplanation(requestData.Vraag)
	if err != nil {
		http.Error(w, "Fout bij ophalen AI uitleg: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"vraag":  requestData.Vraag,
		"uitleg": uitleg,
	}

	jsonResponse, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Fout bij maken van response", http.StatusInternalServerError)
		return
	}

	w.Write(jsonResponse)
}

func OpenServ() {
	http.HandleFunc("/", corsMiddleware(getRoot))
	http.HandleFunc("/getExams", corsMiddleware(getExams))
	http.HandleFunc("/getVragen", corsMiddleware(getVragen))
	http.HandleFunc("/getAntwoorden", corsMiddleware(getAntwoorden))
	http.HandleFunc("/getAiHelp", corsMiddleware(getAiHelp))

	fmt.Println("Server starting on :3333 with CORS enabled...")

	err := http.ListenAndServe(":3333", nil)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Println("http server closed")
	} else if err != nil {
		fmt.Println("http server error:", err)
		os.Exit(1)
	}
}
