import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfUse() {
  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Ana Sayfa
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the ActLedger platform provided by ATAOL AI Techs, you agree to be bound by these Terms of Use. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. License</h2>
            <p>ActLedger is licensed on an enterprise subscription basis. Your license grants non-exclusive, non-transferable access to use the platform for your organization's internal operations only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials, ensuring authorized use within your organization, and complying with applicable laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Data Ownership</h2>
            <p>You retain ownership of all data you enter into the platform. ATAOL AI Techs does not claim ownership of your operational data, KPIs, reports, or any content you create.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. AI-Powered Features</h2>
            <p>The OperIQ module uses artificial intelligence to generate operational insights. These insights are recommendations only and should not replace professional judgment. ATAOL AI Techs is not liable for decisions made based on AI-generated insights.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">6. Service Availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted service. For on-premise deployments, availability depends on your infrastructure. Scheduled maintenance will be communicated in advance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">7. Limitation of Liability</h2>
            <p>ATAOL AI Techs shall not be liable for indirect, incidental, special, or consequential damages arising from the use of the platform. Our total liability shall not exceed the fees paid in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">8. Termination</h2>
            <p>Either party may terminate the license agreement with 30 days written notice. Upon termination, you may export your data within 90 days. After this period, data will be permanently deleted.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">9. Governing Law</h2>
            <p>These terms are governed by the laws of the Republic of Turkey. Any disputes shall be resolved in the courts of Istanbul.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">10. Contact</h2>
            <p>ATAOL AI Techs<br />Bogazici Universitesi Teknopark<br />Email: support@strategythrust.com<br />Web: www.ataolai.tech</p>
          </section>
        </div>
      </div>
    </div>
  )
}
