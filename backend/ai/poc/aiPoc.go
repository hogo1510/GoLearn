package poc

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Geef een social work vraag op als argument")
		return
	}

	question := strings.Join(os.Args[1:], " ")
	explanation, err := GetChatExplanation(question)

	if err != nil {
		fmt.Printf("Fout: %v\n", err)
		return
	}

	fmt.Printf("Vraag: %s\n\n", question)
	fmt.Printf("Uitleg: %s\n", explanation)
}

func GetChatExplanation(question string) (string, error) {
	// Eerst controleren of Ollama server beschikbaar is
	if !isOllamaRunning() {
		return "", fmt.Errorf("Ollama server niet bereikbaar. Start Ollama eerst: ollama serve")
	}

	// Probeer verschillende modellen in volgorde van voorkeur
	models := []string{"mistral", "mixtral", "gemma", "llama2-uncensored", "llama2"}

	for _, model := range models {
		fmt.Printf("Proberen model: %s...\n", model)
		explanation, err := tryWithModel(question, model)
		if err == nil && isValidSocialWorkExplanation(explanation) {
			return explanation, nil
		}
		time.Sleep(100 * time.Millisecond) // Korte pauze
	}

	// Fallback naar generieke social work uitleg
	return getSocialWorkFallback(question), nil
}

func tryWithModel(question, model string) (string, error) {
	// Zeer specifieke prompt voor social work
	prompt := fmt.Sprintf(`<s>[INST] <<SYS>>
Je bent een ervaren social work docent. Geef ALTIJD alleen methodische uitleg over social work principes, NOOIT directe adviezen of oplossingen.

REGELS:
1. NOOIT advies geven ("je moet", "doe dit")
2. Alleen uitleg over social work methodieken en ethiek
3. Maximaal 2 zinnen
4. Focus op beroepswaarden en methodisch handelen
5. Geen oplossingen, alleen uitleg over het concept
6. Nederlands

Voorbeeld:
Vraag: "Hoe omgaan met agressieve cliënt?"
Goed: "Deze situatie raakt aan veiligheid en de-escalatietechnieken in social work. Denk na over professionele boundary-setting."
Slecht: "Je moet de politie bellen en afstand houden."
<</SYS>>

Geef alleen methodische uitleg over deze social work vraag: %s [/INST]`, question)

	requestBody := map[string]interface{}{
		"model":  model,
		"prompt": prompt,
		"stream": false,
		"options": map[string]interface{}{
			"temperature": 0.1,
			"top_p":       0.7,
			"num_predict": 100,
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(
		"http://localhost:11434/api/generate",
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

	var response struct {
		Response string `json:"response"`
		Error    string `json:"error"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return "", err
	}

	if response.Error != "" {
		return "", fmt.Errorf("Model error: %s", response.Error)
	}

	return cleanResponse(response.Response), nil
}

func cleanResponse(response string) string {
	// Verwijder ongewenste delen
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "Uitleg: ")
	response = strings.TrimPrefix(response, "uitleg: ")
	response = strings.TrimPrefix(response, "Methodische uitleg: ")

	// Verwijder eventuele extra tekst na de uitleg
	if strings.Contains(response, "[/INST]") {
		parts := strings.Split(response, "[/INST]")
		if len(parts) > 1 {
			response = parts[1]
		}
	}

	return strings.TrimSpace(response)
}

func isValidSocialWorkExplanation(text string) bool {
	// Check of het een valide social work uitleg is
	if text == "" || len(text) < 20 {
		return false
	}

	// Check op verboden woorden (directe adviezen)
	forbiddenWords := []string{
		" moet ", " ga ", " bel ", " schakel ", " neem contact op met ",
		" adviseer ", " raad aan ", " zoek ", " vraag aan ", " doe ",
	}

	for _, word := range forbiddenWords {
		if strings.Contains(strings.ToLower(text), word) {
			return false
		}
	}

	// Check op gewenste social work termen
	desiredWords := []string{
		"social work", "method", "ethisch", "beroepswaarden", "principe",
		"benadering", "reflectie", "cliënt", "hulpverlening", "systeem",
	}

	found := 0
	for _, word := range desiredWords {
		if strings.Contains(strings.ToLower(text), word) {
			found++
		}
	}

	return found >= 2 // Minimaal 2 social work termen
}

func isOllamaRunning() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	_, err := client.Get("http://localhost:11434/api/tags")
	return err == nil
}

func getSocialWorkFallback(question string) string {
	// Gerichte fallbacks based on question content
	if contains(question, []string{"ethisch", "ethiek", "dilemma", "waarden"}) {
		return "Deze situatie roept belangrijke ethische vragen op voor social professionals. Reflecteer op de beroepscode en morele afwegingen in het handelen."
	}
	if contains(question, []string{"agressie", "veiligheid", "conflict", "weerstand"}) {
		return "Deze casus raakt aan veiligheid en de-escalatie in social work. Denk na over professionele boundary-setting en methodische benaderingen."
	}
	if contains(question, []string{"systeem", "gezin", "familie", "netwerk"}) {
		return "Deze vraag betreft systeemgericht werken in social work. Overweeg de dynamieken binnen sociale netwerken en contextuele factoren."
	}
	if contains(question, []string{"macht", "kwetsbaar", "empowerment", "zelfredzaam"}) {
		return "Deze situatie gaat over machtsdynamiek en empowerment in hulpverleningsrelaties. Reflecteer op positionering en gelijkwaardigheid."
	}

	// Generieke fallback
	return "Deze social work casus vereist methodische afweging en reflectie op beroepswaarden. Denk na over welke principes en benaderingen relevant zijn."
}

func contains(text string, keywords []string) bool {
	lowerText := strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(lowerText, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}
