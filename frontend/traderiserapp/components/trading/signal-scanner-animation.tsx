"use client"

import { useEffect, useRef } from "react"

export default function SignalScannerAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン"
    const alphabet = katakana + "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const fontSize = 16
    let columns = Math.floor(canvas.width / fontSize)
    let rainDrops: number[] = new Array(columns).fill(1)
    let dropsBrightness: number[] = new Array(columns).fill(0)

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      columns = Math.floor(canvas.width / fontSize)
      rainDrops = new Array(columns).fill(1)
      dropsBrightness = new Array(columns).fill(0)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const draw = () => {
      const dark = document.documentElement.classList.contains("dark")
      ctx.fillStyle = dark ? "rgba(0, 0, 0, 0.08)" : "rgba(248, 250, 252, 0.18)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${fontSize}px monospace`
      for (let i = 0; i < columns; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length))
        const x = i * fontSize
        const y = rainDrops[i] * fontSize
        const brightness = Math.max(0, 1 - dropsBrightness[i] / 20)
        const greenIntensity = Math.floor(80 + 140 * brightness)
        ctx.fillStyle = dark
          ? `rgb(0, ${greenIntensity + 40}, 0)`
          : `rgb(5, ${greenIntensity}, 60)`
        ctx.fillText(text, x, y)
        rainDrops[i]++
        dropsBrightness[i]++
        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0
          dropsBrightness[i] = 0
        }
      }
    }

    const interval = setInterval(draw, 35)
    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black" />
}
