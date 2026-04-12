.PHONY: tex pdf clean

# Generate .tex from YAML data
tex:
	node build.mjs

# Generate .tex then compile to PDF
pdf: tex
	cd output && latexmk -xelatex -interaction=nonstopmode -g cv.tex

# Clean build artifacts
clean:
	rm -rf output/*.aux output/*.log output/*.out output/*.fls output/*.fdb_latexmk output/*.xdv
