import s from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={s.footer}>
      <p className={s.text}>
        © {year} <strong>PT Summit Adyawinsa Indonesia</strong><br></br>
        Smart Budget Monitoring System
      </p>
    </footer>
  )
}
