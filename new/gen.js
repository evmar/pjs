// generated by pjs -- do not edit
var symlib = require("./symbol");
var precTable = {
  "lit": 19,
  "list": 19,
  "[]": 18,
  ".": 18,
  "new": 18,
  "call": 18,
  "!": 15,
  "~": 15,
  "++": 15,
  "--": 15,
  "*": 14,
  "/": 14,
  "%": 14,
  "+": 13,
  "-": 13,
  "<": 11,
  ">": 11,
  "instanceof": 11,
  "in": 11,
  "==": 10,
  "!=": 10,
  "obj": 1,
  "&&": 6,
  "||": 6,
  "=": 3,
  "+=": 3,
  ",": 1,
  "none": 1
};
exports.precTable = precTable;

function jsStmt(sexp) {
  var g = gen(sexp);
  if (!g.prec) {
    return g.code;
  }
  var code = g.code;
  if (!symlib.isSymbol(sexp[0], "function")) {
    code += ";";
  }
  return code;
}

function jsExpr(sexp, prec) {
  var g = gen(sexp);
  if (!g.prec) {
    throw new Error("in " + sexp + " stmt here not supported, had code " + g.code);
  }
  if (!(prec in precTable)) {
    throw new Error("unknown prec " + prec);
  }
  var prec = precTable[prec];
  if (prec > g.prec) {
    return "(" + g.code + ")";
  } else {
    return g.code;
  }
}

function snippet(code, prec) {
  if (prec) {
    if (!(prec in precTable)) {
      throw new Error("unknown prec " + prec);
    }
    prec = precTable[prec];
  }
  return {
    code: code,
    prec: prec
  };
}

function stringQuote(str) {
  return "\x22" + str + "\x22";
}
exports.stringQuote = stringQuote;

function genBinOp(sexp) {
  var op = sexp[0].sym();
  var args = sexp.slice(1);
  var exprs = args.map(function(e) {
    return jsExpr(e, op);
  });
  var js = exprs.join(" " + op + " ");
  return snippet(js, op);
}

function genUnOp(sexp) {
  var op = sexp[0].sym();
  var js = op + jsExpr(sexp[1], op);
  return snippet(js, op);
}

function genKeywordStatement(sexp) {
  var body = "";
  if (sexp[1]) {
    body = " " + jsExpr(sexp[1], "none");
  }
  return snippet(sexp[0].sym() + body + ";");
}

function genAt(sexp) {
  var obj = jsExpr(sexp[1], "[]");
  var index = jsExpr(sexp[2], "none");
  return snippet(obj + "[" + index + "]", "[]");
}

function genDo(sexp) {
  return snippet(genStmts(sexp.slice(1)));
}

function genFor(sexp) {
  var init = jsStmt(sexp[1], "none");
  var test = jsExpr(sexp[2], "none");
  var iter = jsExpr(sexp[3], "none");
  var body = genStmts(sexp.slice(4));
  return snippet("for (" + init + " " + test + "; " + iter + ") {" + body + "}");
}

function genFunction(sexp) {
  if (symlib.isSymbol(sexp[1])) {
    var name = sexp[1].sym();
    var args = sexp[2];
    var body = sexp.slice(3);
  } else {
    var name = "";
    var args = sexp[1];
    var body = sexp.slice(2);
  }
  var jsargs = args.map(function(arg) {
    return arg.sym();
  }).join(",");
  var js = "function " + name + "(" + jsargs + ") {" + genStmts(body) + "}";
  return snippet(js, "lit");
}

function genIf(sexp) {
  if (sexp.length < 3 || sexp.length > 4) {
    throw new Error("bad args to 'if'");
  }
  var cond = jsExpr(sexp[1], "none");
  var body = jsStmt(sexp[2]);
  var js = "if (" + cond + ") {" + body + "}";
  if (sexp.length == 4) {
    var elsebody = jsStmt(sexp[3]);
    js += " else {" + elsebody + "}";
  }
  return snippet(js);
}

function genNew(sexp) {
  if (sexp.length > 2) {
    return genNew([sexp[0], sexp.slice(1)]);
  }
  return snippet("new " + jsExpr(sexp[1], "new"), "new");
}

function genVar(sexp) {
  var name = sexp[1].sym();
  var js = "var " + name;
  if (sexp.length > 2) {
    var val = jsExpr(sexp[2], "none");
    js += " = " + val;
  }
  js += ";";
  return snippet(js);
}
var builtins = {
  "break": genKeywordStatement,
  "continue": genKeywordStatement,
  "return": genKeywordStatement,
  "throw": genKeywordStatement,
  "at": genAt,
  "do": genDo,
  "if": genIf,
  "for": genFor,
  "function": genFunction,
  "new": genNew,
  "var": genVar
};
var binops = ["+", "-", "*", "/", "=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "in"];
for (var __pjs_1 = 0; __pjs_1 < binops.length; ++__pjs_1) {
  var op = binops[__pjs_1];
  builtins[op] = genBinOp;
}
var unops = ["++", "--", "!"];
for (var __pjs_1 = 0; __pjs_1 < unops.length; ++__pjs_1) {
  var op = unops[__pjs_1];
  builtins[op] = genUnOp;
}

function genAsArgs(args) {
  return args.map(function(e) {
    return jsExpr(e, ",");
  }).join(", ");
}

function genForm(sexp) {
  var op = sexp[0].sym();
  if (op in builtins) {
    return builtins[op](sexp);
  }
  var func = jsExpr(sexp[0], "call");
  var args = genAsArgs(sexp.slice(1));
  return snippet(func + "(" + args + ")", "call");
}

function gen(sexp) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return snippet(stringQuote(sexp), "lit");
    case "number":
      return snippet(sexp, "lit");
    default:
      if (pjs.isSymbol(sexp)) {
        return snippet(sexp.sym(), "lit");
      } else {
        return genForm(sexp);
      }
  }
}

function genStmts(sexps) {
  var js = "";
  for (var __pjs_1 = 0; __pjs_1 < sexps.length; ++__pjs_1) {
    var sexp = sexps[__pjs_1];
    js += jsStmt(sexp);
  }
  return js;
}
exports.genStmts = genStmts;
