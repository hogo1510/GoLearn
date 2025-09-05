package converter

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strings"
)

// structs voor XML parsing
type AssessmentItem struct {
	XMLName             xml.Name            `xml:"assessmentItem"`
	Title               string              `xml:"title,attr"`
	Identifier          string              `xml:"identifier,attr"`
	ResponseDeclaration ResponseDeclaration `xml:"responseDeclaration"`
	ItemBody            ItemBody            `xml:"itemBody"`
}

type ResponseDeclaration struct {
	XMLName         xml.Name        `xml:"responseDeclaration"`
	Identifier      string          `xml:"identifier,attr"`
	CorrectResponse CorrectResponse `xml:"correctResponse"`
	Mapping         Mapping         `xml:"mapping"`
}

type CorrectResponse struct {
	XMLName xml.Name `xml:"correctResponse"`
	Value   string   `xml:"value"`
}

type Mapping struct {
	XMLName    xml.Name   `xml:"mapping"`
	MapEntries []MapEntry `xml:"mapEntry"`
}

type MapEntry struct {
	XMLName     xml.Name `xml:"mapEntry"`
	MapKey      string   `xml:"mapKey,attr"`
	MappedValue float64  `xml:"mappedValue,attr"`
}

type ItemBody struct {
	XMLName           xml.Name          `xml:"itemBody"`
	Div               Div               `xml:"div"`
	ChoiceInteraction ChoiceInteraction `xml:"choiceInteraction"`
}

type Div struct {
	XMLName xml.Name `xml:"div"`
	P       string   `xml:"p"`
}

type ChoiceInteraction struct {
	XMLName            xml.Name       `xml:"choiceInteraction"`
	ResponseIdentifier string         `xml:"responseIdentifier,attr"`
	SimpleChoices      []SimpleChoice `xml:"simpleChoice"`
}

type SimpleChoice struct {
	XMLName    xml.Name `xml:"simpleChoice"`
	Identifier string   `xml:"identifier,attr"`
	Content    string   `xml:",cdata"`
}

type Vraag struct {
	ID         string  `json:"id"`
	Vraagtekst string  `json:"vraagtekst"`
	Keuzes     []Keuze `json:"keuzes"`
}

type Keuze struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type Antwoord struct {
	VraagID             string `json:"vraag_id"`
	CorrectAntwoordID   string `json:"correct_antwoord_id"`
	CorrectAntwoordText string `json:"correct_antwoord_text"`
}

type XmlConverterOptions struct {
	ReturnVragen     bool
	ReturnAntwoorden bool
	SaveToFile       bool
	DataDir          string
}

func XmlConverter(options XmlConverterOptions) ([]Vraag, []Antwoord, error) {
	dataDir := options.DataDir
	if dataDir == "" {
		dataDir = "backend/converter/dataXML/Sociaal-werk_Beroepsethiek_1"
	}

	var alleVragen []Vraag
	var alleAntwoorden []Antwoord

	files, err := filepath.Glob(filepath.Join(dataDir, "*.xml"))
	if err != nil {
		return nil, nil, fmt.Errorf("fout bij lezen van bestanden: %v", err)
	}

	if len(files) == 0 {
		return nil, nil, fmt.Errorf("geen XML bestanden gevonden in directory: %s", dataDir)
	}

	for _, file := range files {
		fmt.Printf("Verwerken: %s\n", file)

		xmlData, err := ioutil.ReadFile(file)
		if err != nil {
			fmt.Printf("Fout bij lezen XML bestand %s: %v\n", file, err)
			continue
		}

		var assessmentItem AssessmentItem
		if err := xml.Unmarshal(xmlData, &assessmentItem); err != nil {
			fmt.Printf("Fout bij parsen XML %s: %v\n", file, err)
			continue
		}

		vraag, antwoord := extractVraagEnAntwoord(assessmentItem)

		alleVragen = append(alleVragen, vraag)
		alleAntwoorden = append(alleAntwoorden, antwoord)
	}

	if options.ReturnVragen || options.SaveToFile {
		vragenJSON, err := json.MarshalIndent(alleVragen, "", "  ")
		if err != nil {
			return nil, nil, fmt.Errorf("fout bij maken vragen JSON: %v", err)
		}

		if options.SaveToFile {
			if err := ioutil.WriteFile("vragen.json", vragenJSON, 0644); err != nil {
				return nil, nil, fmt.Errorf("fout bij schrijven vragen.json: %v", err)
			}
			fmt.Println("Vragen opgeslagen als vragen.json")
		}

		if options.ReturnVragen {
			fmt.Println("\n=== VRAGEN ===")
			fmt.Println(string(vragenJSON))
		}
	}

	if options.ReturnAntwoorden || options.SaveToFile {
		antwoordenJSON, err := json.MarshalIndent(alleAntwoorden, "", "  ")
		if err != nil {
			return nil, nil, fmt.Errorf("fout bij maken antwoorden JSON: %v", err)
		}

		if options.SaveToFile {
			if err := ioutil.WriteFile("antwoorden.json", antwoordenJSON, 0644); err != nil {
				return nil, nil, fmt.Errorf("fout bij schrijven antwoorden.json: %v", err)
			}
			fmt.Println("Antwoorden opgeslagen als antwoorden.json")
		}

		if options.ReturnAntwoorden {
			fmt.Println("\n=== ANTWOORDEN ===")
			fmt.Println(string(antwoordenJSON))
		}
	}

	if options.SaveToFile {
		fmt.Println("\nConversie voltooid! Bestanden opgeslagen als vragen.json en antwoorden.json")
	}

	var returnVragen []Vraag
	var returnAntwoorden []Antwoord

	if options.ReturnVragen {
		returnVragen = alleVragen
	}
	if options.ReturnAntwoorden {
		returnAntwoorden = alleAntwoorden
	}

	return returnVragen, returnAntwoorden, nil
}

func XmlConverterVragenOnly(dataDir string) ([]Vraag, error) {
	options := XmlConverterOptions{
		ReturnVragen:     true,
		ReturnAntwoorden: false,
		SaveToFile:       false,
		DataDir:          dataDir,
	}
	vragen, _, err := XmlConverter(options)
	return vragen, err
}

func XmlConverterAntwoordenOnly(dataDir string) ([]Antwoord, error) {
	options := XmlConverterOptions{
		ReturnVragen:     false,
		ReturnAntwoorden: true,
		SaveToFile:       false,
		DataDir:          dataDir,
	}
	_, antwoorden, err := XmlConverter(options)
	return antwoorden, err
}

func XmlConverterBoth(dataDir string) ([]Vraag, []Antwoord, error) {
	options := XmlConverterOptions{
		ReturnVragen:     true,
		ReturnAntwoorden: true,
		SaveToFile:       false,
		DataDir:          dataDir,
	}
	return XmlConverter(options)
}

func extractVraagEnAntwoord(ai AssessmentItem) (Vraag, Antwoord) {
	vraagtekst := strings.TrimSpace(ai.ItemBody.Div.P)

	keuzes := make([]Keuze, len(ai.ItemBody.ChoiceInteraction.SimpleChoices))
	for i, sc := range ai.ItemBody.ChoiceInteraction.SimpleChoices {
		keuzes[i] = Keuze{
			ID:   sc.Identifier,
			Text: strings.TrimSpace(sc.Content),
		}
	}

	vraag := Vraag{
		ID:         ai.Identifier,
		Vraagtekst: vraagtekst,
		Keuzes:     keuzes,
	}

	correctAntwoordID := ai.ResponseDeclaration.CorrectResponse.Value
	correctAntwoordText := ""
	for _, keuze := range keuzes {
		if keuze.ID == correctAntwoordID {
			correctAntwoordText = keuze.Text
			break
		}
	}

	antwoord := Antwoord{
		VraagID:             ai.Identifier,
		CorrectAntwoordID:   correctAntwoordID,
		CorrectAntwoordText: correctAntwoordText,
	}

	return vraag, antwoord
}
