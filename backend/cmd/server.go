package cmd

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
)

func getRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got / request\n")
	io.WriteString(w, "main site")
}
func getExamns(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getExams request\n")
	io.WriteString(w, "getting exams")
}
func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	io.WriteString(w, "getting vragen")
}
func getAntwoorden(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAntwoorden request\n")
	io.WriteString(w, "getting antwoorden")
}

func OpenServ() {
	http.HandleFunc("/", getRoot)
	http.HandleFunc("/getExams", getExamns)
	http.HandleFunc("/getVragen", getVragen)
	http.HandleFunc("/getAntwoorden", getAntwoorden)

	err := http.ListenAndServe(":3333", nil)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Println("http server closed")
	} else if err != nil {
		fmt.Println("http server error:", err)
		os.Exit(1)
	}

}
