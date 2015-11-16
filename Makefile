
BABEL = ./node_modules/.bin/babel

node: lib/*.js
	@$(BABEL) lib --out-dir node
