import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  assessmentName?: string
  reportUrl?: string
  firstName?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#172864' }
const container = { padding: '28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', margin: '0 0 12px', color: '#172864' }
const p = { fontSize: '15px', lineHeight: '22px', color: '#2C365B', margin: '0 0 16px' }
const btn = { backgroundColor: '#05CFAB', color: '#172864', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }
const small = { fontSize: '12px', color: '#6b7280', marginTop: '24px' }

const Email = ({ assessmentName = 'GEM.IQ', reportUrl = 'https://gemiq.globaledgemarkets.com/dashboard', firstName }: Props) => (
  <Html>
    <Head />
    <Preview>Your {assessmentName} report is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your {assessmentName} report</Heading>
        <Text style={p}>{firstName ? `Hi ${firstName}, here` : 'Here'} is the link to your {assessmentName} report on GEM.IQ.</Text>
        <Button href={reportUrl} style={btn}>Open my report</Button>
        <Text style={small}>You'll be asked to sign in to GEM.IQ with this email address.</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Email,
  subject: (d) => `Your ${d.assessmentName ?? 'GEM.IQ'} report`,
  displayName: 'Report link (resent by admin)',
  previewData: { assessmentName: 'GTMIQ', reportUrl: 'https://gemiq.globaledgemarkets.com/report/example', firstName: 'Alex' },
}
