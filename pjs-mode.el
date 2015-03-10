;; Copyright 2015 Google Inc. All Rights Reserved.
;;
;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;     http://www.apache.org/licenses/LICENSE-2.0
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.

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
