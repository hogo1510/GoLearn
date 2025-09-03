package cmd

import (
	"backend/converter"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
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

func getExamns(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getExams request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	csvPath := filepath.Join("converter", "MockData", "MockExams.csv")

	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		fmt.Printf("Bestand niet gevonden: %s\n", csvPath)
		http.Error(w, "CSV bestand niet gevonden", http.StatusNotFound)
		return
	}

	data, err := converter.ReadCSV(csvPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij lezen CSV %s: %v", csvPath, err)
		fmt.Println(errorMsg)

		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}
	fmt.Printf("CSV goed geladen")

	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Fout bij lezen van JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	io.WriteString(w, string(jsonData))
}

func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	csvPath := filepath.Join("converter", "MockData", "MockVragen.csv")

	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		fmt.Printf("Bestand niet gevonden: %s\n", csvPath)
		http.Error(w, "CSV bestand niet gevonden", http.StatusNotFound)
		return
	}

	data, err := converter.ReadCSV(csvPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij lezen CSV %s: %v", csvPath, err)
		fmt.Println(errorMsg)

		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}
	fmt.Printf("CSV goed geladen")

	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Fout bij lezen van JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	io.WriteString(w, string(jsonData))
}

func getAntwoorden(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAntwoorden request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	csvPath := filepath.Join("converter", "MockData", "MockAntwoorden.csv")

	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		fmt.Printf("Bestand niet gevonden: %s\n", csvPath)
		http.Error(w, "CSV bestand niet gevonden", http.StatusNotFound)
		return
	}

	data, err := converter.ReadCSV(csvPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij lezen CSV %s: %v", csvPath, err)
		fmt.Println(errorMsg)

		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}
	fmt.Printf("CSV goed geladen")

	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Fout bij lezen van JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	io.WriteString(w, string(jsonData))
}

func OpenServ() {
	http.HandleFunc("/", corsMiddleware(getRoot))
	http.HandleFunc("/getExams", corsMiddleware(getExamns))
	http.HandleFunc("/getVragen", corsMiddleware(getVragen))
	http.HandleFunc("/getAntwoorden", corsMiddleware(getAntwoorden))

	fmt.Println("Server starting on :3333 with CORS enabled...")

	err := http.ListenAndServe(":3333", nil)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Println("http server closed")
	} else if err != nil {
		fmt.Println("http server error:", err)
		os.Exit(1)
	}
}
