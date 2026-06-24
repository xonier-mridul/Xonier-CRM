
import { Outlet } from 'react-router-dom'
import './App.css'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { ToastContainer } from 'react-toastify'
import CustomCursor from './components/common/CustomCursor'

function App() {

  return (
    <>
      <CustomCursor />
      <Navbar />
      <Outlet />
      <Footer />
      <ToastContainer />


    </>
  )
}

export default App
