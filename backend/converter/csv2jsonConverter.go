package converter

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

func ReadCSV(filename string) ([]map[string]string, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("kan bestand niet openen %s: %v", filename, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ','          // standaard comma separator
	reader.FieldsPerRecord = -1 // allow variable number of fields

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("kan CSV niet lezen %s: %v", filename, err)
	}

	if len(records) < 1 {
		return []map[string]string{}, nil
	}

	headers := make([]string, len(records[0]))
	for i, header := range records[0] {
		headers[i] = strings.TrimSpace(header)
	}

	var result []map[string]string

	for rowIndex, record := range records[1:] {
		if len(record) != len(headers) {
			fmt.Printf("Waarschuwing: rij %d heeft %d velden, verwacht %d\n",
				rowIndex+2, len(record), len(headers))
			continue
		}

		item := make(map[string]string)
		for i, header := range headers {
			item[header] = strings.TrimSpace(record[i])
		}
		result = append(result, item)
	}

	fmt.Printf("CSV %s succesvol gelezen: %d rijen\n", filename, len(result))
	return result, nil
}
