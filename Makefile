.PHONY: all lib diff-lib update-lib test out
all: lib test out.js

ifeq ($(NEW),)
PJS=stable/pjs.js
else
PJS=new/pjs.js
endif
$(info Building using $(PJS))

libs=sexp util macro quasi symbol gen
lib: $(foreach lib,$(libs),new/$(lib).js)
new/%.js: lib/%.pjs $(PJS) lib/*
	node $(PJS) $< $@

diff:
	diff -ur stable/ new/
update:
	cp new/* stable

tests=stmt-expr quasi map prec ops literals statements
test: $(foreach test,$(tests),test/js/$(test).js)
test/js/%.js: test/%.pjs $(PJS) lib/*
	node $(PJS) $(TESTFLAGS) $< $@

#node $(PJS) -u -n $< $@ && cat $@
out.js: out.pjs $(PJS) lib/* Makefile
	node $(PJS) $< $@ && cat $@
