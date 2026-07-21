import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Dim { name: string; score: number | string }

interface Props {
  assessmentLabel?: string
  assessmentKey?: string
  contactName?: string
  email?: string
  company?: string
  phone?: string
  score?: number | null
  tier?: string | null
  temperature?: string | null
  dimensions?: Dim[]
  reportUrl?: string | null
  submittedAt?: string
  hubspotContactUrl?: string | null
  hubspotLeadUrl?: string | null
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0b1f3a' }
const container = { padding: '24px 28px', maxWidth: '640px' }
const h1 = { fontSize: '20px', margin: '0 0 4px', color: '#0b1f3a' }
const sub = { fontSize: '13px', color: '#4b5563', margin: '0 0 20px' }
const sectionTitle = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#6b7280', margin: '20px 0 8px' }
const row = { fontSize: '14px', margin: '4px 0', lineHeight: '20px' }
const label = { color: '#6b7280', display: 'inline-block', minWidth: '120px' }
const strong = { color: '#0b1f3a', fontWeight: 600 as const }
const scoreBox = { padding: '12px 16px', background: '#f4f8fb', borderRadius: '6px', border: '1px solid #e5edf3', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const link = { color: '#0b6b7a' }

const Email = ({
  assessmentLabel = 'GEM.IQ Assessment',
  contactName = 'Anonymous',
  email = '',
  company,
  phone,
  score,
  tier,
  temperature,
  dimensions = [],
  reportUrl,
  submittedAt,
  hubspotContactUrl,
  hubspotLeadUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New ${assessmentLabel} submission from ${contactName}${score != null ? ` — Score ${score}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New GEM.IQ Submission</Heading>
        <Text style={sub}>
          {assessmentLabel}{submittedAt ? ` • ${new Date(submittedAt).toLocaleString('en-US')}` : ''}
        </Text>

        <Section style={scoreBox}>
          <Text style={{ ...row, margin: 0 }}>
            <span style={strong}>Score:</span> {score ?? '—'}
            {tier ? <> &nbsp;•&nbsp; <span style={strong}>Tier:</span> {tier}</> : null}
            {temperature ? <> &nbsp;•&nbsp; <span style={strong}>Lead:</span> {temperature}</> : null}
          </Text>
        </Section>

        <Text style={sectionTitle}>Contact</Text>
        <Text style={row}><span style={label}>Name</span><span style={strong}>{contactName}</span></Text>
        <Text style={row}><span style={label}>Email</span><span style={strong}>{email}</span></Text>
        {company ? <Text style={row}><span style={label}>Company</span><span style={strong}>{company}</span></Text> : null}
        {phone ? <Text style={row}><span style={label}>Phone</span><span style={strong}>{phone}</span></Text> : null}

        {dimensions.length ? (
          <>
            <Text style={sectionTitle}>Dimensions</Text>
            {dimensions.map((d) => (
              <Text key={d.name} style={row}>
                <span style={label}>{d.name}</span><span style={strong}>{d.score}</span>
              </Text>
            ))}
          </>
        ) : null}

        {(reportUrl || hubspotContactUrl || hubspotLeadUrl) ? (
          <>
            <Hr style={hr} />
            <Text style={sectionTitle}>Links</Text>
            {reportUrl ? <Text style={row}>📄 <Link style={link} href={reportUrl}>View PDF report</Link></Text> : null}
            {hubspotContactUrl ? <Text style={row}>👤 <Link style={link} href={hubspotContactUrl}>Open HubSpot contact</Link></Text> : null}
            {hubspotLeadUrl ? <Text style={row}>🔥 <Link style={link} href={hubspotLeadUrl}>Open HubSpot lead</Link></Text> : null}
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={{ ...row, color: '#6b7280', fontSize: '12px' }}>
          Sent automatically by GEM.IQ Hub • notify.gemiq.globaledgemarkets.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `[GEM.IQ] ${d.assessmentLabel ?? 'Submission'} — ${d.contactName ?? d.email ?? 'New lead'}${d.score != null ? ` (Score ${d.score})` : ''}${d.temperature ? ` • ${d.temperature}` : ''}`,
  displayName: 'Submission Notification (internal)',
  previewData: {
    assessmentLabel: 'TariffIQ',
    contactName: 'Alejandro Romano',
    email: 'corpcross@gmail.com',
    company: 'Global Edge Markets',
    score: 47,
    tier: 'Developing',
    temperature: 'Warm',
    dimensions: [
      { name: 'Classification', score: 60 },
      { name: 'Valuation', score: 40 },
      { name: 'Origin', score: 30 },
    ],
    reportUrl: 'https://example.com/report.pdf',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry
