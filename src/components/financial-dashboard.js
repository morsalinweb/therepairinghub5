"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { userAPI } from "@/lib/api"
import WithdrawalModal from "@/components/withdrawal-modal"

export default function FinancialDashboard({ userId, userType }) {
  const [financialData, setFinancialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (userId) {
        try {
          setLoading(true)
          const response = await userAPI.getFinancialDashboard(userId)
          if (response.success) {
            setFinancialData(response.data)
          } else {
            toast({
              title: "Error",
              description: response.message || "Failed to load financial data",
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
          setLoading(false)
        }
      }
    }

    fetchFinancialData()
  }, [userId, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!financialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Dashboard</CardTitle>
          <CardDescription>Your financial information will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No financial data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Financial Dashboard</CardTitle>
          <CardDescription>
            {userType === "Seller" ? "Track your earnings and withdrawals" : "Track your spending and transactions"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {userType === "Seller" ? (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                        <h3 className="text-2xl font-bold mt-1">${financialData.totalEarnings.toFixed(2)}</h3>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                        <h3 className="text-2xl font-bold mt-1">${financialData.availableBalance.toFixed(2)}</h3>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Balance</p>
                        <h3 className="text-2xl font-bold mt-1">${financialData.pendingBalance.toFixed(2)}</h3>
                      </div>
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Calendar className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
                        <h3 className="text-2xl font-bold mt-1">${financialData.totalSpending.toFixed(2)}</h3>
                      </div>
                      <div className="p-2 bg-red-100 rounded-full">
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                        <h3 className="text-2xl font-bold mt-1">{financialData.activeJobs}</h3>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed Jobs</p>
                        <h3 className="text-2xl font-bold mt-1">{financialData.completedJobs}</h3>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {financialData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {financialData.recentTransactions.map((transaction) => (
                    <div key={transaction._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`font-bold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {transaction.type === "credit" ? "+" : "-"}${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No recent transactions</div>
              )}
            </CardContent>
          </Card>
        </CardContent>
        {userType === "Seller" && financialData.availableBalance > 0 && (
          <CardFooter>
            <Button onClick={() => setShowWithdrawalModal(true)}>Withdraw Funds</Button>
          </CardFooter>
        )}
      </Card>

      {showWithdrawalModal && (
        <WithdrawalModal
          onClose={() => setShowWithdrawalModal(false)}
          availableBalance={financialData.availableBalance}
          onSuccess={() => {
            // Refresh financial data after successful withdrawal
            userAPI.getFinancialDashboard(userId).then((response) => {
              if (response.success) {
                setFinancialData(response.data)
              }
            })
          }}
        />
      )}
    </>
  )
}
