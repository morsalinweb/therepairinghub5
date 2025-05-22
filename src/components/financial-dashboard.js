"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, DollarSign, CreditCard, TrendingUp, ArrowDownToLine } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { paymentAPI } from "@/lib/api"

export default function FinancialDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [financialData, setFinancialData] = useState({
    availableBalance: 0,
    totalEarnings: 0,
    totalSpending: 0,
    recentTransactions: [],
    spendingByCategory: [],
    earningsTrend: [],
  })

  useEffect(() => {
    fetchFinancialData()

    // Set up polling for real-time updates
    const interval = setInterval(fetchFinancialData, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users/financial-dashboard")
      const data = await response.json()

      if (data.success) {
        console.log("Financial data received:", data.financialData)
        setFinancialData(data.financialData)
      } else {
        console.error("Failed to fetch financial data:", data.message)
        toast({
          title: "Error",
          description: data.message || "Failed to load financial data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number.parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(withdrawAmount)

    if (amount > financialData.availableBalance) {
      toast({
        title: "Insufficient funds",
        description: `You don't have enough funds to withdraw this amount. Available balance: $${financialData.availableBalance.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    // Check if user has PayPal email
    if (!user?.paypalEmail) {
      toast({
        title: "PayPal email required",
        description: "Please add your PayPal email in your profile settings before withdrawing funds.",
        variant: "destructive",
      })
      return
    }

    setIsWithdrawing(true)

    try {
      console.log(`Attempting to withdraw ${amount} to PayPal email: ${user.paypalEmail}`)
      const result = await paymentAPI.processWithdrawal(amount)

      if (result.success) {
        toast({
          title: "Withdrawal initiated",
          description: result.message || `$${amount} is being sent to your PayPal account.`,
        })

        // Update financial data
        setFinancialData((prev) => ({
          ...prev,
          availableBalance: result.newBalance || prev.availableBalance - amount,
        }))

        setWithdrawAmount("")

        // Refresh financial data
        fetchFinancialData()
      } else {
        toast({
          title: "Withdrawal failed",
          description: result.message || "There was a problem processing your withdrawal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Withdrawal error:", error)
      toast({
        title: "Withdrawal failed",
        description: "There was a problem processing your withdrawal",
        variant: "destructive",
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {user?.userType === "Seller" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialData.availableBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Available for withdrawal</p>

              <div className="mt-4 space-y-2">
                <Label htmlFor="withdrawAmount">Withdraw to PayPal</Label>
                <div className="flex space-x-2">
                  <Input
                    id="withdrawAmount"
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={financialData.availableBalance}
                  />
                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || financialData.availableBalance <= 0 || !user?.paypalEmail}
                    title={!user?.paypalEmail ? "Add PayPal email in profile settings first" : ""}
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Withdraw
                      </>
                    )}
                  </Button>
                </div>
                {!user?.paypalEmail && (
                  <p className="text-xs text-amber-500 mt-1">
                    Please add your PayPal email in your profile settings first.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {user?.userType === "Seller" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialData.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>
        )}

        {user?.userType === "Buyer" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialData.totalSpending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Lifetime spending</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          {user?.userType === "Buyer" && <TabsTrigger value="spending">Spending by Category</TabsTrigger>}
          {user?.userType === "Seller" && <TabsTrigger value="earnings">Earnings Trend</TabsTrigger>}
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your recent payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {financialData.recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No transactions found</p>
              ) : (
                <div className="space-y-4">
                  {financialData.recentTransactions.map((transaction, index) => (
                    <div key={transaction.id || index} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{transaction.jobTitle || transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()} • {transaction.category || transaction.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${transaction.type === "withdrawal" ? "text-red-500" : transaction.type === "job_payment" && user?.userType === "Seller" ? "text-green-500" : ""}`}
                        >
                          {transaction.type === "withdrawal"
                            ? "-"
                            : transaction.type === "job_payment" && user?.userType === "Buyer"
                              ? "-"
                              : "+"}
                          ${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs capitalize">{transaction.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user?.userType === "Buyer" && (
          <TabsContent value="spending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>How your spending is distributed</CardDescription>
              </CardHeader>
              <CardContent>
                {financialData.spendingByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No spending data available</p>
                ) : (
                  <div className="h-80">
                    <div className="space-y-4">
                      {financialData.spendingByCategory.map((category, index) => (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: getColorForIndex(index) }}
                          ></div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span>{category.category}</span>
                              <span className="font-medium">${category.amount.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div
                                className="h-2.5 rounded-full"
                                style={{
                                  width: `${((category.amount / getTotalAmount(financialData.spendingByCategory)) * 100).toFixed(0)}%`,
                                  backgroundColor: getColorForIndex(index),
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user?.userType === "Seller" && (
          <TabsContent value="earnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Trend</CardTitle>
                <CardDescription>Your earnings over time</CardDescription>
              </CardHeader>
              <CardContent>
                {financialData.earningsTrend.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No earnings data available</p>
                ) : (
                  <div className="h-80">
                    <div className="space-y-4">
                      {financialData.earningsTrend.map((month, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-24 text-sm">{month.month}</div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">${month.amount.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div
                                className="h-2.5 rounded-full bg-blue-600"
                                style={{
                                  width: `${((month.amount / getMaxAmount(financialData.earningsTrend)) * 100).toFixed(0)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// Helper functions for charts
function getColorForIndex(index) {
  const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]
  return colors[index % colors.length]
}

function getTotalAmount(data) {
  return data.reduce((sum, item) => sum + item.amount, 0)
}

function getMaxAmount(data) {
  return Math.max(...data.map((item) => item.amount), 0.01) // Avoid division by zero
}
