import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import Home from './pages/landing/Home.jsx'
import CompanyPage from './pages/company/Company.jsx'
import Form from './pages/form/Form.jsx'
import CheckOutButton from './components/pages/payment/CheckOutButton.jsx'
import SolutionPage from './components/common/SolutionPage.jsx'

import Pricing from './pages/pricing/Pricing.jsx'
import FooterPage from './components/common/FooterPage.jsx'
import Careers from './pages/career/Careers.jsx'
import JobDetails from './pages/jobDetails/JobDetails.jsx'
import Blogs from './pages/blogs/Blogs.jsx'
import CheckoutForm from './components/pages/payment/CheckoutForm.jsx'
import PaymentSuccess from './components/pages/payment/Success.jsx'
import PaymentCancel from './components/pages/payment/Cancel.jsx'
import Feature from './pages/feature/Feature.jsx'



const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path='/' element={<App />}>
        <Route index element={<Home />} />
        <Route path='Company' element={<CompanyPage />} />
        <Route path='/Form' element={<Form />} />
        <Route path='/Payment' element={<CheckOutButton />} />
        <Route path='/Solution/:top/:slug' element={<SolutionPage />} />
        <Route path='/Feature' element={<Feature />} />
        <Route path='/Pricing' element={<Pricing />} />
        <Route path='/Product/:slug' element={<FooterPage />} />
        <Route path='/Career' element={<Careers />} />
        <Route path='/Career/:slug' element={<JobDetails />} />
        <Route path='/Blogs' element={<Blogs />} />
        <Route path='/paypal/payment' element={<CheckoutForm />} />
        <Route path='/payment/success' element={<PaymentSuccess />} />
        <Route path='/payment/cancel' element={<PaymentCancel />} />
      </Route>
    </>
  )
)

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router}>
  </RouterProvider>
)
