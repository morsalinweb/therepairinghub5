import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Info, AlertTriangle } from "lucide-react"

export default function Documentation() {
  return (
    <div className="container py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">Repairing Hub Documentation</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">Learn how to use Repairing Hub effectively</p>
        </div>

        <Tabs defaultValue="getting-started">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="customers">For Customers</TabsTrigger>
              <TabsTrigger value="providers">For Service Providers</TabsTrigger>
              <TabsTrigger value="payments">Payments & Security</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="getting-started">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started with Repairing Hub</CardTitle>
                <CardDescription>Learn the basics of using our platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">What is Repairing Hub?</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Repairing Hub is a two-sided marketplace that connects customers seeking small jobs (assembly,
                    repairs, household help) with skilled service providers. Our platform makes it easy to find reliable
                    help for your home maintenance needs or to offer your services to those who need them.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Creating an Account</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To get started with Repairing Hub, you'll need to create an account. Follow these steps:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Click on the "Register" button in the top right corner of the homepage.</li>
                    <li>Enter your email address, phone number, and create a password.</li>
                    <li>
                      Choose your account type: "Buyer" if you want to post jobs, or "Seller" if you want to offer
                      services.
                    </li>
                    <li>Complete your profile by adding your name, bio, and profile picture.</li>
                  </ol>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Navigating the Platform</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Once you've created an account, you can navigate the platform using the main menu:
                  </p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Home:</strong> The main landing page with featured jobs and services.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Jobs:</strong> Browse all available jobs or post your own if you're a customer.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Services:</strong> Explore service categories and providers.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Profile:</strong> Manage your account, view your jobs or services, and track earnings.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Notifications:</strong> Stay updated on new quotes, messages, and job status changes.
                      </span>
                    </li>
                  </ul>
                </section>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300">Need more help?</h3>
                    <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                      If you have any questions or need assistance, please visit our{" "}
                      <Link href="/contact" className="underline">
                        Contact page
                      </Link>{" "}
                      to get in touch with our support team.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>For Customers: Posting Jobs & Hiring</CardTitle>
                <CardDescription>Learn how to post jobs and hire service providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Posting a Job</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To post a job on Repairing Hub, follow these steps:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Click on the "Post a Job" button in the header or on your profile page.</li>
                    <li>
                      Fill out the job details form, including:
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Job title: A clear, concise title describing the job</li>
                        <li>Job description: Detailed information about what needs to be done</li>
                        <li>Budget: How much you're willing to pay for the service</li>
                        <li>Location: Where the job needs to be performed</li>
                        <li>Date needed: When you need the job to be completed</li>
                      </ul>
                    </li>
                    <li>Review your job details and click "Continue to Payment".</li>
                    <li>Select your payment method (credit/debit card or PayPal) and complete the payment process.</li>
                    <li>Your job will be posted and visible to service providers.</li>
                  </ol>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Reviewing Quotes</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    After posting a job, service providers will send you quotes. Here's how to review them:
                  </p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>Go to your job listing or check your notifications for new quotes.</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        Review each provider's quote, including their price, message, and any attached images.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>Click "Message" to ask questions or discuss details with the provider.</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>Compare quotes based on price, provider experience, and communication.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Hiring a Service Provider</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">When you're ready to hire a service provider:</p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Click the "Hire" button on the provider's quote.</li>
                    <li>Confirm your decision in the popup dialog.</li>
                    <li>The funds you paid when posting the job will be held in escrow.</li>
                    <li>The provider will be notified that they've been hired.</li>
                    <li>You can communicate with the provider through the messaging system to coordinate details.</li>
                  </ol>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Completing a Job</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    After the service provider has completed the job:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Inspect the work to ensure it meets your requirements.</li>
                    <li>If satisfied, click the "Mark as Completed" button on the job page.</li>
                    <li>The funds held in escrow will be released to the service provider.</li>
                    <li>You'll be prompted to leave a review and rating for the provider.</li>
                    <li>The job will be marked as completed in your job history.</li>
                  </ol>
                </section>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Important Note</h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                      Only mark a job as completed after you've thoroughly inspected the work. Once you mark a job as
                      completed, the funds will be released to the provider and cannot be refunded.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <CardTitle>For Service Providers: Finding Jobs & Getting Paid</CardTitle>
                <CardDescription>Learn how to find jobs, submit quotes, and receive payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Finding Jobs</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    As a service provider, you can find jobs in several ways:
                  </p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Browse Jobs:</strong> Go to the "Jobs" page to see all available jobs.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Use Filters:</strong> Filter jobs by location, category, and price range to find
                        relevant opportunities.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Search:</strong> Use the search bar to find specific types of jobs.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Notifications:</strong> Enable notifications to be alerted when new jobs matching your
                        skills are posted.
                      </span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Submitting Quotes</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    When you find a job you're interested in, you can submit a quote:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Click on the job to view its details.</li>
                    <li>Review the job description, budget, location, and timeline.</li>
                    <li>Scroll down to the "Send a Quote" section.</li>
                    <li>
                      Write a detailed message explaining:
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Your experience and qualifications relevant to the job</li>
                        <li>How you plan to approach the job</li>
                        <li>Your estimated timeline</li>
                        <li>Any questions you have for the customer</li>
                      </ul>
                    </li>
                    <li>Enter your price for the job.</li>
                    <li>Optionally, attach an image (e.g., previous similar work).</li>
                    <li>Click "Submit Quote" to send your proposal to the customer.</li>
                  </ol>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Getting Hired</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">After submitting quotes, customers may:</p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Message you:</strong> Respond promptly and professionally to build trust.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Request more information:</strong> Be prepared to provide additional details about your
                        experience or approach.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Hire you:</strong> You'll receive a notification when you're hired for a job.
                      </span>
                    </li>
                  </ul>
                  <p className="text-gray-600 dark:text-gray-300 mt-4">
                    When hired, coordinate with the customer to schedule the job and discuss any specific requirements.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Getting Paid</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    When you complete a job, payment is processed through our secure system:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>After you finish the job, ask the customer to mark it as completed.</li>
                    <li>
                      Once the customer confirms completion, the funds held in escrow will be released to your account.
                    </li>
                    <li>The platform fee (10%) will be deducted automatically.</li>
                    <li>You can view your earnings in the "Earnings" tab of your profile.</li>
                    <li>Withdraw your available funds to your PayPal account at any time.</li>
                  </ol>
                </section>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300">Pro Tip</h3>
                    <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                      Maintain a high rating by providing quality service, communicating clearly, and completing jobs on
                      time. Highly-rated providers are more likely to get hired for future jobs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payments & Security</CardTitle>
                <CardDescription>Learn about our secure payment system and escrow service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">How Payments Work</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Repairing Hub uses a secure escrow payment system to protect both customers and service providers:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>
                      <strong>Job Posting:</strong> When a customer posts a job, they pay the job budget plus a 10%
                      service fee.
                    </li>
                    <li>
                      <strong>Escrow:</strong> The funds are held securely in escrow until the job is completed.
                    </li>
                    <li>
                      <strong>Hiring:</strong> When a provider is hired, the funds remain in escrow.
                    </li>
                    <li>
                      <strong>Completion:</strong> After the job is completed and the customer confirms satisfaction,
                      the funds are released to the provider.
                    </li>
                    <li>
                      <strong>Platform Fee:</strong> A 10% fee is deducted from the provider's payment as a platform
                      service fee.
                    </li>
                  </ol>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Payment Methods</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Repairing Hub supports the following payment methods:
                  </p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Credit/Debit Cards:</strong> All major credit and debit cards are accepted.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>PayPal:</strong> Secure payments through your PayPal account.
                      </span>
                    </li>
                  </ul>
                  <p className="text-gray-600 dark:text-gray-300 mt-4">
                    For withdrawals, service providers can transfer their earnings to their PayPal account.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Security Measures</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    We take security seriously and have implemented several measures to protect our users:
                  </p>
                  <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Secure Payments:</strong> All payment information is encrypted and processed securely.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Escrow System:</strong> Funds are held securely until job completion, protecting both
                        parties.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>User Verification:</strong> We verify user identities to ensure platform safety.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Ratings & Reviews:</strong> Our review system helps identify reliable users.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      <span>
                        <strong>Secure Messaging:</strong> All communications between users are encrypted.
                      </span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Dispute Resolution</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    In case of disagreements between customers and service providers:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>First, try to resolve the issue through direct communication.</li>
                    <li>If that doesn't work, either party can open a dispute through the platform.</li>
                    <li>Our support team will review the case, including all messages and job details.</li>
                    <li>We may request additional information or evidence from both parties.</li>
                    <li>After review, we'll make a fair decision about the release of funds.</li>
                  </ol>
                </section>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Important Security Notice</h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                      Never share your payment information or conduct transactions outside of the Repairing Hub
                      platform. Doing so will void our protection guarantees and may result in account suspension.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
