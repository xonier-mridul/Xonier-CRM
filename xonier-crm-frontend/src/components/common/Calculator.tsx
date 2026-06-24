"use client"

import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { AiOutlineClockCircle } from 'react-icons/ai'
import { RxCross2, RxCrossCircled } from "react-icons/rx"

type HistoryItem = {
  expression: string
  result: string
  timestamp: number
}

export default function Calculator({ setCalOpen }: { setCalOpen: (v: boolean) => void }) {
  const [expression, setExpression] = useState('')
  const [displayResult, setDisplayResult] = useState<string | null>(null)
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const historyEndRef = useRef<HTMLDivElement>(null)


  /* ------------------ Persistence ------------------ */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('calc-history-v1')
      if (raw) setHistory(JSON.parse(raw))
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('calc-history-v1', JSON.stringify(history))
    } catch { /* noop */ }
  }, [history])

  /* ------------------ Helpers ------------------ */
  const formatExpr = (expr: string) =>
    expr
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/-/g, '−')

  const evaluate = (expr: string): string => {
    try {
      const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      if (!/^[0-9+\-*/.() ]+$/.test(clean)) return 'Error'
      // eslint-disable-next-line no-new-func
      const val = new Function('return ' + clean)()
      if (!isFinite(val)) return 'Error'
      return parseFloat(val.toFixed(8)).toString()
    } catch {
      return 'Error'
    }
  }

  /* ------------------ Actions ------------------ */
  const clear = useCallback(() => {
    setExpression('')
    setDisplayResult(null)
    setJustEvaluated(false)
  }, [])

  const inputDigit = useCallback((d: string) => {
    if (justEvaluated) {
      setExpression(d)
      setDisplayResult(null)
      setJustEvaluated(false)
    } else {
      setExpression(prev => prev + d)
    }
  }, [justEvaluated])

  const inputDot = useCallback(() => {
    if (justEvaluated) {
      setExpression('0.')
      setDisplayResult(null)
      setJustEvaluated(false)
      return
    }
    const parts = expression.split(/[\+\-\*\/]/)
    const last = parts[parts.length - 1]
    if (!last.includes('.')) {
      setExpression(prev => (prev === '' ? '0.' : prev + '.'))
    }
  }, [expression, justEvaluated])

  const inputOperator = useCallback((op: string) => {
    if (justEvaluated) {
      setExpression((displayResult || '0') + op)
      setDisplayResult(null)
      setJustEvaluated(false)
      return
    }
    setExpression(prev => {
      const trimmed = prev.trim()
      if (/[\+\-\*\/]$/.test(trimmed)) return trimmed.slice(0, -1) + op
      if (trimmed === '') return '0' + op
      return trimmed + op
    })
  }, [justEvaluated, displayResult])

  const equal = useCallback(() => {
    let expr = expression.trim().replace(/[\+\-\*\/]$/, '')
    if (!expr) return
    const result = evaluate(expr)
    setExpression(expr)
    setDisplayResult(result)
    setJustEvaluated(true)
    if (result !== 'Error') {
      setHistory(prev => {
        const next = [...prev, { expression: expr, result, timestamp: Date.now() }]
        return next.slice(-10) // keep last 10
      })
    }
  }, [expression])

  const backspace = useCallback(() => {
    if (justEvaluated) {
      clear()
      return
    }
    setExpression(prev => prev.slice(0, -1))
  }, [justEvaluated, clear])

  const toggleSign = useCallback(() => {
    if (/^-?\d+\.?\d*$/.test(expression)) {
      setExpression(prev => (prev.startsWith('-') ? prev.slice(1) : '-' + prev))
    }
  }, [expression])

  const percent = useCallback(() => {
    if (/^\d+\.?\d*$/.test(expression)) {
      setExpression(prev => String(parseFloat(prev) / 100))
    }
  }, [expression])

  /* ------------------ Keyboard ------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key)
      if (e.key === '.') inputDot()
      if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equal() }
      if (e.key === 'Backspace') backspace()
      if (e.key === 'Escape') clear()
      if (['+', '-', '*', '/'].includes(e.key)) {
        const map: Record<string, string> = { '+': '+', '-': '-', '*': '*', '/': '/' }
        inputOperator(map[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inputDigit, inputDot, equal, backspace, clear, inputOperator])

  /* ------------------ History scroll ------------------ */
  useEffect(() => {
    if (showHistory) historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showHistory])

  /* ------------------ Styles ------------------ */
  const btn = "h-12 sm:h-14 rounded-2xl text-base sm:text-lg font-semibold transition-all active:scale-95 flex items-center justify-center select-none"
  const num = "dark:bg-slate-800 bg-slate-200 text-gray-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 shadow-md shadow-black/10 dark:shadow-black/20"
  const opBtn = "bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/30"
  const util = "bg-slate-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"

  const keys = [
    { l: 'AC', c: `${btn} ${util}`, f: clear, col: 1 },
    { l: '+/−', c: `${btn} ${util}`, f: toggleSign, col: 1 },
    { l: '%', c: `${btn} ${util}`, f: percent, col: 1 },
    { l: '÷', c: `${btn} ${opBtn}`, f: () => inputOperator('/'), col: 1 },
    { l: '7', c: `${btn} ${num}`, f: () => inputDigit('7'), col: 1 },
    { l: '8', c: `${btn} ${num}`, f: () => inputDigit('8'), col: 1 },
    { l: '9', c: `${btn} ${num}`, f: () => inputDigit('9'), col: 1 },
    { l: '×', c: `${btn} ${opBtn}`, f: () => inputOperator('*'), col: 1 },
    { l: '4', c: `${btn} ${num}`, f: () => inputDigit('4'), col: 1 },
    { l: '5', c: `${btn} ${num}`, f: () => inputDigit('5'), col: 1 },
    { l: '6', c: `${btn} ${num}`, f: () => inputDigit('6'), col: 1 },
    { l: '−', c: `${btn} ${opBtn}`, f: () => inputOperator('-'), col: 1 },
    { l: '1', c: `${btn} ${num}`, f: () => inputDigit('1'), col: 1 },
    { l: '2', c: `${btn} ${num}`, f: () => inputDigit('2'), col: 1 },
    { l: '3', c: `${btn} ${num}`, f: () => inputDigit('3'), col: 1 },
    { l: '+', c: `${btn} ${opBtn}`, f: () => inputOperator('+'), col: 1 },
    { l: '0', c: `${btn} ${num} col-span-2`, f: () => inputDigit('0'), col: 2 },
    { l: '.', c: `${btn} ${num}`, f: inputDot, col: 1 },
    { l: '=', c: `${btn} ${opBtn}`, f: equal, col: 1 },
  ]

  return (
    <div className="relative w-full max-w-xs bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl z-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
          title="History"
        >
          <span>
            <AiOutlineClockCircle />
            </span>
        </button>

        <span onClick={() => setCalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer group">
          <RxCross2 className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
        </span>
      </div>

      {/* Display */}
      <div className="px-5 pb-4 min-h-[6.5rem] flex flex-col justify-end gap-0.5">
        {/* Expression line */}
        <div className="text-right text-slate-500 dark:text-slate-400 text-sm font-medium break-all leading-tight min-h-[1.25rem]">
          {expression ? formatExpr(expression) + (justEvaluated ? ' =' : '') : '\u00A0'}
        </div>
        {/* Result / Live line */}
        <div className={`text-right text-4xl sm:text-5xl font-light tracking-tight overflow-hidden text-ellipsis transition-colors duration-200 ${
          displayResult !== null ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'
        }`}>
          {displayResult ?? (expression ? formatExpr(expression) : '0')}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="absolute inset-x-0 w-80 max-h-90 overflow-y-scroll top-0 -left-85 bg-white dark:bg-slate-900  z-20 flex flex-col border rounded-xl border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between  px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Calculations</span>
            <div className='flex items-center gap-4'>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-red-500  hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Clear
              </button>
            )}

            <span className='text-slate-500 group' onClick={() => setShowHistory(!showHistory)}><RxCrossCircled  className='group-hover:text-red-500'/></span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-10">No calculations yet</div>
            ) : (
              [...history].reverse().map((item, i) => (
                <button
                  key={item.timestamp + '-' + i}
                  onClick={() => {
                    setExpression(item.result)
                    setDisplayResult(null)
                    setJustEvaluated(false)
                    setShowHistory(false)
                  }}
                  className="w-full text-right p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{formatExpr(item.expression)} =</div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.result}
                  </div>
                </button>
              ))
            )}
            <div ref={historyEndRef} />
          </div>
        </div>
      )}

      {/* Keypad */}
      <div className="p-4 pt-2 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {keys.map((k, i) => (
            <button key={i} onClick={k.f} className={k.c} style={{ gridColumn: `span ${k.col}` }}>
              {k.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}