package poc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	if len(os.Args) < 2 {
		return
	}

	question := strings.Join(os.Args[1:], " ")
	explanation, err := getChatExplanation(question)

	if err != nil {
		fmt.Printf("Fout: %v\n", err)
		return
	}

	fmt.Printf("Vraag: %s\n\n", question)
	fmt.Printf("Uitleg: %s\n", explanation)
}

func GetChatExplanation(question string) (string, error) {
	requestBody := map[string]interface{}{
		"model": "llama2",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "Geef uitleg in 2-3 zinnen in het Nederlands. Nooit het antwoord geven! Begin direct met de uitleg zonder 'Uitleg:' te zeggen.",
			},
			{
				"role":    "user",
				"content": question,
			},
		},
		"stream": false,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(
		"http://localhost:11434/api/chat",
		"application/json",
		bytes.NewReader(jsonData),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var chatResponse struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		Error string `json:"error"`
	}

	if err := json.Unmarshal(body, &chatResponse); err != nil {
		return "", err
	}

	if chatResponse.Error != "" {
		return "", fmt.Errorf(chatResponse.Error)
	}

	// Direct return zonder cleanup
	return strings.TrimSpace(chatResponse.Message.Content), nil
}
