
build:
	npx esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx --loader:.css=local-css

watch:
	npx esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx --loader:.css=local-css --watch

