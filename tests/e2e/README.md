# Tests end-to-end (Playwright)

Scripts Python autonomes, à lancer avec le serveur de développement sur
`http://localhost:8080` :

```bash
python3 tests/e2e/pages-smoke.py   # navigation + absence d'erreur console
python3 tests/e2e/csv-import.py    # import CSV : mapping, doublons, rapport
```

`csv-import.py` génère son propre fichier CSV d'exemple (une ligne valide, un
doublon, une ligne en erreur) et vérifie le rapport d'import.
