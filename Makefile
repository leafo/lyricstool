
build:
	esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx

watch:
	esbuild main.js --bundle --outfile=bundle.js --loader:.js=jsx --watch

