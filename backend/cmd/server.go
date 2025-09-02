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
	io.WriteString(w, "[\n  {\n    \"id\": 1,\n    \"naam\": \"Wiskunde Examen\",\n    \"vak\": \"Wiskunde\",\n    \"niveau\": \"Havo 4\",\n    \"tijdsduur\": 90\n  },\n  {\n    \"id\": 2,\n    \"naam\": \"Nederlands Toets\",\n    \"vak\": \"Nederlands\",\n    \"niveau\": \"Vwo 5\",\n    \"tijdsduur\": 60\n  }\n]")
}
func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	io.WriteString(w, "[\n  {\n    \"id\": 1,\n    \"examen_id\": 1,\n    \"vraag\": \"Los de vergelijking op: 2x + 5 = 13\",\n    \"punten\": 2,\n    \"type\": \"open\"\n  },\n  {\n    \"id\": 2,\n    \"examen_id\": 1,\n    \"vraag\": \"Wat is de afgeleide van f(x) = x²?\",\n    \"punten\": 1,\n    \"type\": \"meerkeuze\"\n  },\n  {\n    \"id\": 3,\n    \"examen_id\": 2,\n    \"vraag\": \"Noem 3 kenmerken van een betoog\",\n    \"punten\": 3,\n    \"type\": \"open\"\n  }\n]")
}
func getAntwoorden(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAntwoorden request\n")
	io.WriteString(w, "[\n  {\n    \"id\": 1,\n    \"vraag_id\": 1,\n    \"correct_antwoord\": \"x = 4\",\n    \"uitleg\": \"2x + 5 = 13 → 2x = 8 → x = 4\"\n  },\n  {\n    \"id\": 2,\n    \"vraag_id\": 2,\n    \"correct_antwoord\": \"2x\",\n    \"meerkeuze_opties\": [\"x\", \"2x\", \"2\", \"x²\"]\n  },\n  {\n    \"id\": 3,\n    \"vraag_id\": 3,\n    \"correct_antwoord\": \"Stelling, argumenten, conclusie\",\n    \"uitleg\": \"Een betoog bestaat uit een stelling, ondersteunende argumenten en een conclusie\"\n  }\n]")
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
