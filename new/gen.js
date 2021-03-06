// generated by pjs -- do not edit
var macro = require("./macro");
var quasi = require("./quasi");
var symbol = require("./symbol");
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

function showError(sexp, text) {
  return "at " + sexp.line + ":" + sexp.col + ": " + sexp + text;
}

function jsStmt(sexp, outVar) {
  var g = gen(sexp, outVar);
  if (!g.prec) {
    return g.code;
  }
  var code = g.code;
  if (outVar == "return") {
    return "return " + code + ";";
  }
  if (outVar) {
    return outVar + " = " + code + ";";
  }
  if (!symbol.isSym(sexp[0], "function")) {
    code += ";";
  }
  return code;
}

function jsExpr(sexp, prec) {
  if (prec == "none" && sexp.length == 0) {
    return "";
  }
  var g = gen(sexp);
  if (!g.prec) {
    throw new Error(showError(sexp, "stmt here not supported, had code " + g.code));
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

function reQuote(str) {
  return "/" + str + "/";
}
exports.reQuote = reQuote;

function genBinOp(sexp) {
  var op = symbol.str(sexp[0]);
  var args = sexp.slice(1);
  var exprs = args.map(function(e) {
    return jsExpr(e, op);
  });
  var js = exprs.join(" " + op + " ");
  return snippet(js, op);
}

function genUnOp(sexp) {
  var op = symbol.str(sexp[0]);
  var js = op + jsExpr(sexp[1], op);
  return snippet(js, op);
}

function genKeywordStatement(sexp) {
  var body = "";
  if (sexp[1]) {
    body = " " + jsExpr(sexp[1], "none");
  }
  return snippet(symbol.str(sexp[0]) + body + ";");
}

function genCall(sexp) {
  var func = jsExpr(sexp[0], "call");
  var args = genAsArgs(sexp.slice(1));
  return snippet(func + "(" + args + ")", "call");
}

function genDot(sexp, outVar) {
  if (sexp.length > 3) {
    var args = sexp.slice(3);
    sexp = sexp.slice(0, 3);
    if (args.length == 1 && args[0].length == 0) {
      args = [];
    }
    return gen([sexp].concat(args), outVar);
  }
  var obj = jsExpr(sexp[1], ".");
  var attr = symbol.str(sexp[2]);
  return snippet(obj + "." + attr, ".");
}

function genQuasiQuote(sexp) {
  var quoted = jsExpr(quasi.qq(sexp[1]), "none");
  return snippet(quoted, "none");
}

function genQuote(sexp) {
  var quoterName = symbol.str(sexp[1]);
  var text = sexp[2];
  var quoter = pjs.quote[quoterName];
  if (!quoter) {
    throw new Error("unknown quoter: " + quoterName);
  }
  return snippet(quoter(text), "lit");
}

function genAt(sexp) {
  var obj = jsExpr(sexp[1], "[]");
  var index = jsExpr(sexp[2], "none");
  return snippet(obj + "[" + index + "]", "[]");
}

function genDefmacro(sexp) {
  var name = symbol.str(sexp[1]);
  var args = sexp[2].map(symbol.str);
  var body = sexp.slice(3);
  var jsbody = genStmts(body);
  var fn = new Function(args.join(","), jsbody);
  macros[name] = fn;
  return snippet("/* macro " + name + " */", "none");
}

function genMacro(sexp) {
  var body = sexp.slice(1);
  var f = new Function([], genStmts(body));
  return gen(f());
}

function genDo(sexp) {
  return snippet(genStmts(sexp.slice(1)));
}

function genFor(sexp) {
  var init = jsStmt(sexp[1]);
  var test = jsExpr(sexp[2], "none");
  var iter = jsExpr(sexp[3], "none");
  var body = genStmts(sexp.slice(4));
  return snippet("for (" + init + " " + test + "; " + iter + ") {" + body + "}");
}

function genFunction(sexp) {
  if (symbol.isSym(sexp[1])) {
    var name = symbol.str(sexp[1]);
    var args = sexp[2];
    var body = sexp.slice(3);
  } else {
    var name = "";
    var args = sexp[1];
    var body = sexp.slice(2);
  }
  var vararg = null;
  for (var i = 0; i < args.length; ++i) {
    if (symbol.isSym(args[i], ".")) {
      vararg = args[i + 1];
      args = args.slice(0, i);
      break;
    }
  }
  var jsargs = args.map(function(arg) {
    return symbol.str(arg);
  }).join(",");
  var varargjs;
  if (vararg) {
    varargjs = jsStmt([pjs.sym("var"), vararg, [pjs.sym("Array.prototype.slice.call"), pjs.sym("arguments"), i]]);
  } else {
    varargjs = "";
  }
  var js = "function " + name + "(" + jsargs + ") {" + varargjs + genStmts(body) + "}";
  return snippet(js, "lit");
}

function genIf(sexp, outVar) {
  if (sexp.length < 3 || sexp.length > 4) {
    throw new Error("bad args to 'if'");
  }
  var cond = jsExpr(sexp[1], "none");
  var body = jsStmt(sexp[2], outVar);
  var js = "if (" + cond + ") {" + body + "}\n";
  if (sexp.length == 4) {
    var elsebody = jsStmt(sexp[3], outVar);
    js += " else {" + elsebody + "}\n";
  }
  return snippet(js);
}

function genList(sexp) {
  return snippet("[" + genAsArgs(sexp.slice(1)) + "]", "lit");
}

function genNew(sexp) {
  if (sexp.length > 2) {
    return genNew([sexp[0], sexp.slice(1)]);
  }
  return snippet("new " + jsExpr(sexp[1], "new"), "new");
}

function genObj(sexp) {
  var js = "{";
  for (var i = 1; i < sexp.length; i += 2) {
    var key = sexp[i];
    var val = sexp[i + 1];
    if (symbol.isSym(key)) {
      key = symbol.str(key);
    } else {
      if (typeof(key) == "string") {
        key = stringQuote(key);
      } else {
        throw new Error("cannot make obj literal with " + key);
      }
    }
    val = jsExpr(val, "none");
    if (i > 1) {
      js += ", ";
    }
    js += key + ":" + val;
  }
  js += "}";
  return snippet(js, "lit");
}

function genReturn(sexp, outVar) {
  var body = gen(sexp[1], "return");
  if (body.prec) {
    return snippet("return " + body.code + ";");
  } else {
    return body;
  }
}

function genSwitch(sexp, outVar) {
  var cond = jsExpr(sexp[1], "none");
  var js = "switch (" + cond + ") {\n";
  for (var i = 2; i < sexp.length; ++i) {
    var scase = sexp[i];
    if (symbol.isSym(scase[0], "default")) {
      js += "default:\n";
    } else {
      js += "case " + jsExpr(scase[0], "none") + ":\n";
    }
    if (js.length > 1) {
      js += genStmts(scase.slice(1), outVar);
      if (outVar && outVar != "return") {
        js += "break;";
      }
    }
  }
  js += "}";
  return snippet(js);
}

function genVar(sexp, outVar) {
  if (!!outVar) {
    throw new Error("can't use var as expr");
  }
  var name = symbol.str(sexp[1]);
  var js = "var " + name;
  if (sexp.length > 2) {
    var body = gen(sexp[2], name);
    if (body.prec) {
      js += " = " + body.code + ";\n";
    } else {
      js += ";\n" + body.code;
    }
  } else {
    js += ";";
  }
  return snippet(js);
}

function genWhile(sexp, outVar) {
  if (!!outVar) {
    throw new Error("can't use while as expr");
  }
  var cond = jsExpr(sexp[1], "none");
  return snippet("while (" + cond + ") {\n" + genStmts(sexp.slice(2)) + "}");
}
var builtins = {
  "break": genKeywordStatement,
  "continue": genKeywordStatement,
  "throw": genKeywordStatement,
  ".": genDot,
  "`": genQuasiQuote,
  "#": genQuote,
  "at": genAt,
  "do": genDo,
  "if": genIf,
  "for": genFor,
  "function": genFunction,
  "list": genList,
  "macro": genMacro,
  "new": genNew,
  "obj": genObj,
  "return": genReturn,
  "switch": genSwitch,
  "var": genVar,
  "while": genWhile,
  "+": genBinOp,
  "-": genBinOp,
  "*": genBinOp,
  "/": genBinOp,
  "=": genBinOp,
  "==": genBinOp,
  "!=": genBinOp,
  "<": genBinOp,
  ">": genBinOp,
  "<=": genBinOp,
  ">=": genBinOp,
  "&&": genBinOp,
  "||": genBinOp,
  "+=": genBinOp,
  "-=": genBinOp,
  "*=": genBinOp,
  "/=": genBinOp,
  "in": genBinOp,
  "instanceof": genBinOp,
  "++": genUnOp,
  "--": genUnOp,
  "!": genUnOp
};
var macros = {
  "fn": macro.fn,
  "caseSexp": macro.caseSexp,
  "forEach": macro.forEach,
  "assert": macro.assert,
  "map": macro.map,
  "genSym": symbol.genSym.take
};

function runMacro(f, sexp, outVar) {
  var code = f.apply(null, sexp.slice(1));
  return gen(code, outVar);
}

function genAsArgs(args) {
  return args.map(function(e) {
    return jsExpr(e, ",");
  }).join(", ");
}

function genForm(sexp, outVar) {
  if (sexp.length == 0) {
    if (!!outVar) {
      throw new Error("empty sexp");
    }
    return snippet(";");
  }
  if (symbol.isSym(sexp[0])) {
    var op = symbol.str(sexp[0]);
    if (op in builtins) {
      return builtins[op](sexp, outVar);
    }
    if (op in macros) {
      return runMacro(macros[op], sexp, outVar);
    }
  }
  return genCall(sexp, outVar);
}

function gen(sexp, outVar) {
  switch (typeof(sexp)) {
    case "undefined":
      throw new Error("undefined sexp");
    case "string":
      return snippet(stringQuote(sexp), "lit");
    case "number":
      return snippet(sexp, "lit");
    default:
      if (pjs.isSym(sexp)) {
        return snippet(symbol.str(sexp), "lit");
      } else {
        return genForm(sexp, outVar);
      }
  }
}

function genStmts(sexps, outVar) {
  var js = "";
  for (var __pjs_1 = 0; __pjs_1 < sexps.length; ++__pjs_1) {
    var sexp = sexps[__pjs_1];
    js += jsStmt(sexp, outVar);
  }
  return js;
}
exports.genStmts = genStmts;
