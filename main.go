package main

import (
	"log"
	"net/http"
	"text/template"
)

const port = ":8080"

func main() {

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/", homePageHandler)

	log.Printf("Starting server at: http://localhost:8080")
	log.Fatal(http.ListenAndServe(port, nil))
}
func homePageHandler(w http.ResponseWriter, r *http.Request) {
	err := renderTempl(w, r)
	if err != nil {
		http.Error(w, err.Error(), 404)
	}
}
func renderTempl(w http.ResponseWriter, r *http.Request) error {
	templ, err := template.ParseFiles("static/" + "index.html")
	if err != nil {
		return err
	}
	err = templ.Execute(w, nil)
	if err != nil {
		return err
	}
	return nil
}
