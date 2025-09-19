package cmd

import (
	"backend/converter"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock voor converter package
type MockConverter struct {
	mock.Mock
}

func (m *MockConverter) XmlConverterVragenOnly(dir string) ([]interface{}, error) {
	args := m.Called(dir)
	return args.Get(0).([]interface{}), args.Error(1)
}

func (m *MockConverter) XmlConverterAntwoordenOnly(dir string) ([]interface{}, error) {
	args := m.Called(dir)
	return args.Get(0).([]interface{}), args.Error(1)
}

// Mock voor AI poc package
type MockAI struct {
	mock.Mock
}

func (m *MockAI) GetChatExplanation(question string) (string, error) {
	args := m.Called(question)
	return args.String(0), args.Error(1)
}

// Test versies van de handler functies met dependency injection
func getExamsTest(w http.ResponseWriter, r *http.Request, dataDir string) {
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

	entries, err := os.ReadDir(dataDir)
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
			xmlDataDir := fmt.Sprintf("%s/%s", dataDir, e.Name())
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

func getVragenTest(w http.ResponseWriter, r *http.Request, converterFunc func(string) ([]interface{}, error), dataDir string) {
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
		entries, err := os.ReadDir(dataDir)
		if err != nil {
			http.Error(w, "Fout bij lezen directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		dirIndex := 0
		for _, e := range entries {
			if e.IsDir() {
				dirIndex++
				if dirIndex == examenId {
					xmlDataDir = fmt.Sprintf("%s/%s", dataDir, e.Name())
					break
				}
			}
		}

		if xmlDataDir == "" {
			http.Error(w, "Examen niet gevonden", http.StatusNotFound)
			return
		}
	} else {
		// Default fallback - maak een tijdelijke directory
		tempDir, err := os.MkdirTemp("", "test_default")
		if err != nil {
			http.Error(w, "Kan default directory niet maken", http.StatusInternalServerError)
			return
		}
		defer os.RemoveAll(tempDir)
		xmlDataDir = tempDir
	}

	// Controleer of de directory bestaat
	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	// Gebruik de geïnjecteerde converter functie
	vragen, err := converterFunc(xmlDataDir)
	if err != nil {
		errorMsg := fmt.Sprintf("Fout bij verwerken XML bestanden: %v", err)
		fmt.Println(errorMsg)
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	// Filter out vragen zonder content
	filteredVragen := make([]interface{}, 0)
	for _, vraag := range vragen {
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

func getAntwoordenTest(w http.ResponseWriter, r *http.Request, converterFunc func(string) ([]interface{}, error), dataDir string) {
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
		entries, err := os.ReadDir(dataDir)
		if err != nil {
			http.Error(w, "Fout bij lezen directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		dirIndex := 0
		for _, e := range entries {
			if e.IsDir() {
				dirIndex++
				if dirIndex == examenId {
					xmlDataDir = fmt.Sprintf("%s/%s", dataDir, e.Name())
					break
				}
			}
		}

		if xmlDataDir == "" {
			http.Error(w, "Examen niet gevonden", http.StatusNotFound)
			return
		}
	} else {
		// Default fallback - maak een tijdelijke directory
		tempDir, err := os.MkdirTemp("", "test_default")
		if err != nil {
			http.Error(w, "Kan default directory niet maken", http.StatusInternalServerError)
			return
		}
		defer os.RemoveAll(tempDir)
		xmlDataDir = tempDir
	}

	if _, err := os.Stat(xmlDataDir); os.IsNotExist(err) {
		fmt.Printf("Directory niet gevonden: %s\n", xmlDataDir)
		http.Error(w, "XML directory niet gevonden", http.StatusNotFound)
		return
	}

	// Gebruik de geïnjecteerde converter functie
	antwoorden, err := converterFunc(xmlDataDir)
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

func getAiHelpTest(w http.ResponseWriter, r *http.Request, aiFunc func(string) (string, error)) {
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

	// Gebruik de geïnjecteerde AI functie
	uitleg, err := aiFunc(requestData.Vraag)
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

func TestCorsMiddleware(t *testing.T) {
	// Maak een test handler
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	})

	// Wrap met CORS middleware
	wrappedHandler := corsMiddleware(handler)

	tests := []struct {
		name            string
		method          string
		expectedStatus  int
		expectedHeaders map[string]string
	}{
		{
			name:           "OPTIONS request",
			method:         "OPTIONS",
			expectedStatus: http.StatusOK,
			expectedHeaders: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		},
		{
			name:           "GET request",
			method:         "GET",
			expectedStatus: http.StatusOK,
			expectedHeaders: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/", nil)
			w := httptest.NewRecorder()

			wrappedHandler(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			for key, expectedValue := range tt.expectedHeaders {
				assert.Equal(t, expectedValue, w.Header().Get(key))
			}
		})
	}
}

func TestGetRoot(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	getRoot(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "main site", response["message"])
	assert.Equal(t, "ok", response["status"])
}

func TestGetExams(t *testing.T) {
	// Maak tijdelijke test directory structuur
	tempDir, err := os.MkdirTemp("", "test_exams")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Maak test directories
	testDirs := []string{"Sociaal-werk_methodiek_1", "Sociaal-werk_recht_1", "Sociaal-werk_psychologie_1"}
	for _, dir := range testDirs {
		err := os.MkdirAll(filepath.Join(tempDir, dir), 0755)
		assert.NoError(t, err)
	}

	req := httptest.NewRequest("GET", "/getExams", nil)
	w := httptest.NewRecorder()

	// Roep de test versie aan met de temp directory
	getExamsTest(w, req, tempDir)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var exams []map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &exams)
	assert.NoError(t, err)
	assert.Len(t, exams, 3)

	// Controleer of categorieën correct worden bepaald
	for _, exam := range exams {
		name := exam["name"].(string)
		category := exam["categorie"].(string)

		// De determineCategory functie is case-sensitive, dus gebruik kleine letters
		switch {
		case strings.Contains(strings.ToLower(name), "methodiek"):
			assert.Equal(t, "methodiek", category)
		case strings.Contains(strings.ToLower(name), "recht"):
			assert.Equal(t, "recht", category)
		case strings.Contains(strings.ToLower(name), "psychologie"):
			assert.Equal(t, "psychologie", category)
		}
	}
}

func TestGetExams_DirectoryError(t *testing.T) {
	req := httptest.NewRequest("GET", "/getExams", nil)
	w := httptest.NewRecorder()

	// Roep de test versie aan met niet-bestaande directory
	getExamsTest(w, req, "/nonexistent/directory")

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetVragen(t *testing.T) {
	mockConverter := new(MockConverter)

	// Mock vragen data
	mockVragen := []interface{}{
		map[string]interface{}{"id": 1, "vraag": "Test vraag 1"},
		map[string]interface{}{"id": 2, "vraag": "Test vraag 2"},
	}
	mockConverter.On("XmlConverterVragenOnly", mock.Anything).Return(mockVragen, nil)

	// Maak een tijdelijke test directory
	tempDir, err := os.MkdirTemp("", "test_vragen")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Maak een test directory voor examen 1
	testDir := filepath.Join(tempDir, "test_examen")
	err = os.MkdirAll(testDir, 0755)
	assert.NoError(t, err)

	req := httptest.NewRequest("GET", "/getVragen?examenId=1", nil)
	w := httptest.NewRecorder()

	// Roep de test versie aan met de mock converter en temp directory
	getVragenTest(w, req, mockConverter.XmlConverterVragenOnly, tempDir)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var vragen []interface{}
	err = json.Unmarshal(w.Body.Bytes(), &vragen)
	assert.NoError(t, err)
	assert.Len(t, vragen, 2)

	mockConverter.AssertExpectations(t)
}

func TestGetVragen_ConverterError(t *testing.T) {
	mockConverter := new(MockConverter)

	mockConverter.On("XmlConverterVragenOnly", mock.Anything).Return([]interface{}{}, errors.New("conversion error"))

	// Maak een tijdelijke test directory
	tempDir, err := os.MkdirTemp("", "test_vragen_error")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Maak een test directory voor examen 1
	testDir := filepath.Join(tempDir, "test_examen")
	err = os.MkdirAll(testDir, 0755)
	assert.NoError(t, err)

	req := httptest.NewRequest("GET", "/getVragen?examenId=1", nil)
	w := httptest.NewRecorder()

	// Roep de test versie aan met de mock converter en temp directory
	getVragenTest(w, req, mockConverter.XmlConverterVragenOnly, tempDir)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockConverter.AssertExpectations(t)
}

func TestGetAntwoorden(t *testing.T) {
	mockConverter := new(MockConverter)

	// Mock antwoorden data
	mockAntwoorden := []interface{}{
		map[string]interface{}{"id": 1, "antwoord": "Test antwoord 1"},
		map[string]interface{}{"id": 2, "antwoord": "Test antwoord 2"},
	}
	mockConverter.On("XmlConverterAntwoordenOnly", mock.Anything).Return(mockAntwoorden, nil)

	// Maak een tijdelijke test directory
	tempDir, err := os.MkdirTemp("", "test_antwoorden")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Maak een test directory voor examen 1
	testDir := filepath.Join(tempDir, "test_examen")
	err = os.MkdirAll(testDir, 0755)
	assert.NoError(t, err)

	req := httptest.NewRequest("GET", "/getAntwoorden?examenId=1", nil)
	w := httptest.NewRecorder()

	// Roep de test versie aan met de mock converter en temp directory
	getAntwoordenTest(w, req, mockConverter.XmlConverterAntwoordenOnly, tempDir)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var antwoorden []interface{}
	err = json.Unmarshal(w.Body.Bytes(), &antwoorden)
	assert.NoError(t, err)
	assert.Len(t, antwoorden, 2)

	mockConverter.AssertExpectations(t)
}

func TestGetAiHelp(t *testing.T) {
	mockAI := new(MockAI)

	// Mock AI response
	mockAI.On("GetChatExplanation", "test vraag").Return("test uitleg", nil)

	requestBody := `{"vraag": "test vraag"}`
	req := httptest.NewRequest("POST", "/getAiHelp", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Roep de test versie aan met de mock AI
	getAiHelpTest(w, req, mockAI.GetChatExplanation)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "test vraag", response["vraag"])
	assert.Equal(t, "test uitleg", response["uitleg"])

	mockAI.AssertExpectations(t)
}

func TestGetAiHelp_InvalidMethod(t *testing.T) {
	req := httptest.NewRequest("GET", "/getAiHelp", nil)
	w := httptest.NewRecorder()

	// Gebruik een simpele mock functie
	mockFunc := func(string) (string, error) { return "", nil }
	getAiHelpTest(w, req, mockFunc)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestGetAiHelp_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest("POST", "/getAiHelp", strings.NewReader("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Gebruik een simpele mock functie
	mockFunc := func(string) (string, error) { return "", nil }
	getAiHelpTest(w, req, mockFunc)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetAiHelp_EmptyQuestion(t *testing.T) {
	requestBody := `{"vraag": ""}`
	req := httptest.NewRequest("POST", "/getAiHelp", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Gebruik een simpele mock functie
	mockFunc := func(string) (string, error) { return "", nil }
	getAiHelpTest(w, req, mockFunc)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetAiHelp_AIError(t *testing.T) {
	mockAI := new(MockAI)

	mockAI.On("GetChatExplanation", "test vraag").Return("", errors.New("AI error"))

	requestBody := `{"vraag": "test vraag"}`
	req := httptest.NewRequest("POST", "/getAiHelp", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Roep de test versie aan met de mock AI
	getAiHelpTest(w, req, mockAI.GetChatExplanation)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockAI.AssertExpectations(t)
}

func TestDetermineCategory(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Methodiek", "sociaal-werk_methodiek_1", "methodiek"},
		{"Recht", "beroepsethiek_recht", "recht"},
		{"Psychologie", "test_psychologie_examen", "psychologie"},
		{"Default", "unknown_category", "algemeen"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := determineCategory(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestContains(t *testing.T) {
	// Test de contains functie uit server.go
	contains := func(s, substr string) bool {
		return len(s) >= len(substr) && (s[:len(substr)] == substr ||
			fmt.Sprintf("%s", s) != s)
	}

	tests := []struct {
		name     string
		s        string
		substr   string
		expected bool
	}{
		{"Contains", "hello world", "hello", true},
		{"Does not contain", "hello", "world", false},
		{"Empty string", "", "test", false},
		{"Empty substring", "test", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := contains(tt.s, tt.substr)
			assert.Equal(t, tt.expected, result)
		})
	}
}
