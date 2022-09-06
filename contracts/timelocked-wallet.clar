
;; timelocked-wallet
;; <add a description here>

;; constants
;;

;; owner
(define-constant contract-owner tx-sender)

;; Errors
(define-constant err-owner-only (err u100))
(define-constant err-already-locked (err u101))
(define-constant err-unlock-in-the-past (err u100))
(define-constant err-no-value (err u100))
(define-constant err-beneficiary-only (err u100))
(define-constant err-unlock-height-not-reached (err u100))


;; data maps and vars
;;

;; data
(define-data-var beneficiary (optional principal) none)
(define-data-var unlock-height uint u0)

;; private functions
;;

;; public functions
;;
(define-public (lock (new-beneficiary principal) (unlock-at uint) (amount uint))
    (begin
        (asserts! ( is-eq tx-sender contract-owner ) err-owner-only)
        (asserts! ( is-none ( var-get beneficiary) ) err-already-locked )
        (asserts! (> unlock-at block-height) err-unlock-in-the-past) ;;maybe this is error
        (asserts! (> amount u0) err-no-value)
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender))) ;; misunderstood in this part
        (var-set beneficiary (some new-beneficiary) )
        (var-set unlock-height unlock-at)
        (ok true)
    )
)

(define-public (bestow (new-beneficiary principal))
    (begin
        (asserts! (is-eq (some tx-sender) (var-get beneficiary)) err-beneficiary-only)
        (var-set beneficiary (some new-beneficiary))
        (ok true)
    )
)

(define-public (claim)
    (begin
        (asserts! (is-eq (some tx-sender) (var-get beneficiary)) err-beneficiary-only)
        (asserts! (>= block-height (var-get unlock-height)) err-unlock-height-not-reached)
        (as-contract (stx-transfer? (stx-get-balance tx-sender) tx-sender (unwrap-panic (var-get beneficiary))))
    )
)