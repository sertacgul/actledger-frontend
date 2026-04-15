import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Ana Sayfa
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">1. Introduction</h2>
            <p>ATAOL AI Techs ("we", "our", "us") operates the ActLedger platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">2. Information We Collect</h2>
            <p>We collect information you provide directly, including name, email address, company information, and usage data. We also collect operational data that you enter into the platform such as tasks, reports, KPIs, and departmental information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">3. How We Use Your Information</h2>
            <p>We use collected information to provide and maintain the platform, improve user experience, generate AI-powered insights (OperIQ), send administrative communications, and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">4. Data Security</h2>
            <p>We implement industry-standard security measures including encryption, access controls, and regular security audits. For on-premise deployments, data remains within your infrastructure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting support@strategythrust.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">6. Third-Party Services</h2>
            <p>Our platform may use third-party AI services for operational analytics. All data processed by third-party services is subject to their respective privacy policies and our data processing agreements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may also object to processing or request data portability. For KVKK (Turkish Data Protection Law) and GDPR requests, contact us at support@strategythrust.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mt-8 mb-3">8. Contact</h2>
            <p>ATAOL AI Techs<br />Bogazici Universitesi Teknopark<br />Email: support@strategythrust.com<br />Phone: +90 532 201 3416</p>
          </section>
        </div>
      </div>
    </div>
  )
}
