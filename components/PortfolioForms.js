"use client"
import React, { useState } from "react"
import PortfolioManager from "./PortfolioManager"
import PortfolioResult from "./PortfolioResult"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://192.168.0.106:5080"

const ParentComponent = () => {
  const [loading, setLoading] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [submissionError, setSubmissionError] = useState("")
  const [resultData, setResultData] = useState([])

  const handleFormSubmit = async (data) => {
    try {
      setLoading(true)
      setSubmissionResult(null)
      setSubmissionError("")

      const response = await fetch(`${API_BASE_URL}/api/portfolio/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials:
          process.env.NODE_ENV === "production" ? "include" : "same-origin",
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to submit portfolios")
      }

      const responseData = await response.json()
      const results = responseData.results || responseData

      console.log("API Response:", results)
      setResultData(results)
      setSubmissionResult("Portfolios calculated successfully!")
    } catch (error) {
      console.error("Submission error:", error)
      setSubmissionError(
        error.message || "An error occurred while submitting portfolios"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto my-10 px-4">
      <h1 className="text-center text-3xl font-bold mb-6">
        Portfolio Calculator
      </h1>

      {process.env.NODE_ENV !== "production" && (
        <Alert className="mb-4">
          <AlertDescription>
            Running in development mode - Using API: {API_BASE_URL}
          </AlertDescription>
        </Alert>
      )}

      {submissionResult && (
        <Alert
          className="mb-4 bg-green-100 border border-green-300 text-green-800"
        >
          <AlertDescription>{submissionResult}</AlertDescription>
        </Alert>
      )}

      {submissionError && (
        <Alert
          className="mb-4 bg-red-100 border border-red-300 text-red-800"
        >
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      <PortfolioManager onSubmit={handleFormSubmit} loading={loading} columns />

      {loading && (
        <div className="flex flex-col items-center justify-center mt-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Calculating portfolios...
          </p>
        </div>
      )}

      {!loading && resultData?.length > 0 && (
        <div className="mt-6 space-y-6">
          {resultData.map((portfolio, index) => (
            <Card key={portfolio.portfolio_index || index} className="p-4">
              <PortfolioResult
                portfolio={portfolio}
                index={index}
                apiBaseUrl={API_BASE_URL}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ParentComponent
