
.PHONY: build watch dist

build:
	npx esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx --loader:.css=local-css

watch:
	npx esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx --loader:.css=local-css --watch

dist:
	mkdir -p dist
	npx esbuild main.js --bundle --outfile=dist/bundle.js --loader:.js=jsx --loader:.css=local-css --minify
	cp index.html dist/

