'use client'

import { useEffect } from 'react'

export function ReadingProgress() {
  useEffect(() => {
    const updateReadingProgress = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scrolled = (winScroll / height) * 100
      const progressBar = document.getElementById('reading-progress')
      if (progressBar) {
        progressBar.style.width = scrolled + '%'
      }
    }

    window.addEventListener('scroll', updateReadingProgress)
    updateReadingProgress() // Initial call

    return () => {
      window.removeEventListener('scroll', updateReadingProgress)
    }
  }, [])

  return (
    <div className="reading-progress">
      <div className="reading-progress-bar" id="reading-progress"></div>
    </div>
  )
}
