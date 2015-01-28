(defconst pjs-font-lock-keywords
  `(
    (,(rx symbol-start
          (or "break" "case" "continue" "default" "do" "for" "function"
              "if" "new" "return" "switch" "var" "while")
          symbol-end)
     0 font-lock-keyword-face)))
   
(define-derived-mode pjs-mode scheme-mode "PJS"
  "docs here"
  (setq font-lock-defaults '(pjs-font-lock-keywords))
  ;(setq syntax-begin-function 'beginning-of-defun)

  (put 'do 'scheme-indent-function 0)
  (put 'for 'scheme-indent-function 3)
  (put 'function 'scheme-indent-function 'defun)
  (put 'if 'scheme-indent-function 1)
  (put 'switch 'scheme-indent-function 1)
  (put 'while 'scheme-indent-function 1)

  (paredit-mode))
