import Link from 'next/link'

export function CheckoutShellHeader() {
  return (
    <header className="border-b border-va-lightgray-300 bg-white">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1304px]:px-0 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 md:gap-3 outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2"
        >
          <img
            src="/branding/logo.svg"
            alt=""
            width={233}
            height={167}
            className="h-10 w-auto md:h-11"
          />
          <img
            src="/branding/logo_text.svg"
            alt="Vrije Academie"
            width={490}
            height={68}
            className="h-7 w-auto sm:h-8 md:h-9"
          />
        </Link>
      </div>
    </header>
  )
}
