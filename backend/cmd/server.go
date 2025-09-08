package cmd

import (
	"backend/ai/poc"
	"backend/converter"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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
		id   int    `json:"id"`
		name string `json:"name"`
	}

	entries, err := os.ReadDir("../backend/converter/dataXML")
	if err != nil {
		log.Fatal(err)
	}

	for _, e := range entries {
		fmt.Println(e.Name())
	}

}

func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	xmlDataDir := "converter/dataXML/Sociaal-werk_Beroepsethiek_1"

	// Controleer of de directory bestaat
	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	vragen, err := converter.XmlConverterVragenOnly(xmlDataDir)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij verwerken XML bestanden: %v", err)
		fmt.Println(errorMsg)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	fmt.Printf("Aantal vragen geladen: %d\n", len(vragen))

	jsonData, err := json.Marshal(vragen)
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

	xmlDataDir := "converter/dataXML/Sociaal-werk_Beroepsethiek_1"

	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	vragen, err := converter.XmlConverterAntwoordenOnly(xmlDataDir)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij verwerken XML bestanden: %v", err)
		fmt.Println(errorMsg)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	fmt.Printf("Aantal vragen geladen: %d\n", len(vragen))

	jsonData, err := json.Marshal(vragen)
	if err != nil {
		http.Error(w, "Fout bij converteren naar JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

func getAiHelp(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAiHelp request\n")

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

	w.Header().Set("Content-Type", "application/json")
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
