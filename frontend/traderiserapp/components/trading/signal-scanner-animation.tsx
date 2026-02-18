"use client"

import { useEffect, useRef } from "react"

export default function SignalScannerAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Classic Matrix digital rain characters
    const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン"
    const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const nums = "0123456789"
    const alphabet = katakana + latin + nums

    const fontSize = 16

    // These will be updated on resize
    let columns = Math.floor(canvas.width / fontSize)
    let rainDrops: number[] = new Array(columns).fill(1)
    let dropsBrightness: number[] = new Array(columns).fill(0)

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // Recalculate columns and reinitialize arrays
      columns = Math.floor(canvas.width / fontSize)
      rainDrops = new Array(columns).fill(1)
      dropsBrightness = new Array(columns).fill(0)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const draw = () => {
      // Semi-transparent overlay for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length))
        const x = i * fontSize
        const y = rainDrops[i] * fontSize

        // Brightness gradient: head bright → tail dark
        const brightness = Math.max(0, 1 - dropsBrightness[i] / 20)
        const greenIntensity = Math.floor(150 + 105 * brightness)
        ctx.fillStyle = `rgb(0, ${greenIntensity}, 0)`

        ctx.fillText(text, x, y)

        rainDrops[i]++
        dropsBrightness[i]++

        // Reset drop randomly when off-screen
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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-black opacity-80" />
}