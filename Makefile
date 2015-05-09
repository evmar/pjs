.PHONY: all lib diff-lib update-lib test
all: lib test

NODE := node
#NODE := node_modules/.bin/node-debug

ifeq ($(NEW),)
PJS := stable/pjs.js
else
PJS := new/pjs.js
endif
PJSCMD := $(PJS) $(FLAGS)
$(info Building using "$(PJSCMD)")

libs := sexp util macro quasi symbol gen sexp-print
lib: $(foreach lib,$(libs),new/$(lib).js)
new/%.js: lib/%.pjs $(PJS) lib/*
	$(NODE) $(PJSCMD) $< $@

diff:
	diff -ur stable/ new/
update:
	cp new/* stable

tests := builtins stmt-expr quasi macro map prec ops literals
test: $(foreach test,$(tests),test/js/$(test).js)
test/js/%.js: test/%.pjs $(PJS) lib/*
	$(NODE) $(PJSCMD) $< $@
