package cmd

import (
	"errors"
	"fmt"
	"io"
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

// Je bestaande functies met CORS headers
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
	io.WriteString(w, `[
        {
            "id": 1,
            "naam": "Wiskunde Examen",
            "vak": "Wiskunde",
            "niveau": "Havo 4",
            "tijdsduur": 90
        },
        {
            "id": 2,
            "naam": "Nederlands Toets",
            "vak": "Nederlands",
            "niveau": "Vwo 5",
            "tijdsduur": 60
        }
    ]`)
}

func getVragen(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getVragen request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	io.WriteString(w, `[
        {
            "id": 1,
            "examen_id": 1,
            "vraag": "Los de vergelijking op: 2x + 5 = 13",
            "punten": 2,
            "type": "open"
        },
        {
            "id": 2,
            "examen_id": 1,
            "vraag": "Wat is de afgeleide van f(x) = x²?",
            "punten": 1,
            "type": "meerkeuze"
        },
        {
            "id": 3,
            "examen_id": 2,
            "vraag": "Noem 3 kenmerken van een betoog",
            "punten": 3,
            "type": "open"
        }
    ]`)
}

func getAntwoorden(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got /getAntwoorden request\n")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	io.WriteString(w, `[
        {
            "id": 1,
            "vraag_id": 1,
            "correct_antwoord": "x = 4",
            "uitleg": "2x + 5 = 13 → 2x = 8 → x = 4"
        },
        {
            "id": 2,
            "vraag_id": 2,
            "correct_antwoord": "2x",
            "meerkeuze_opties": ["x", "2x", "2", "x²"]
        },
        {
            "id": 3,
            "vraag_id": 3,
            "correct_antwoord": "Stelling, argumenten, conclusie",
            "uitleg": "Een betoog bestaat uit een stelling, ondersteunende argumenten en een conclusie"
        }
    ]`)
}

func OpenServ() {
	// Gebruik de CORS middleware voor elke handler
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
