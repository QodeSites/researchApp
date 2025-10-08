"use client"
import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ChartColorManager({ chartOptions, setChartOptions }) {
  const [open, setOpen] = useState(false)
  const [tempColors, setTempColors] = useState([])

  const handleOpen = () => {
    setTempColors(chartOptions?.series?.map((s) => s.color || "#000000"))
    setOpen(true)
  }

  const handleSave = () => {
    setChartOptions((prev) => ({
      ...prev,
      series: prev.series.map((s, i) => ({ ...s, color: tempColors[i] })),
    }))
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="flex items-center gap-1"
      >
        🎨 Change Colors
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Series Colors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {chartOptions?.series?.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4"
              >
                <strong className="min-w-[120px]">{s.name}</strong>
                <Input
                  type="color"
                  value={tempColors[i]}
                  onChange={(e) => {
                    const updated = [...tempColors]
                    updated[i] = e.target.value
                    setTempColors(updated)
                  }}
                  className="h-8 w-12 p-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Colors</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
