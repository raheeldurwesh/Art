import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#FAF8F5',
    fontFamily: 'Times-Roman',
  },
  outerBorder: {
    borderWidth: 3,
    borderColor: '#B45309', // Rich Gold
    borderStyle: 'solid',
    height: '100%',
    padding: 6,
  },
  innerBorder: {
    borderWidth: 1.5,
    borderColor: '#1E3A8A', // Royal Navy
    borderStyle: 'solid',
    height: '100%',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justify: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  // Top Header Section
  topHeader: {
    alignItems: 'center',
    marginTop: 4,
  },
  instituteTitle: {
    fontSize: 26,
    fontFamily: 'Times-Bold',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'Times-Italic',
    color: '#B45309',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    width: '65%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D97706',
  },
  dividerDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#B45309',
    marginHorizontal: 10,
    transform: 'rotate(45deg)',
  },
  // Title Section
  certTitle: {
    fontSize: 34,
    fontFamily: 'Times-Bold',
    color: '#B45309',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  presentationText: {
    fontSize: 11,
    fontFamily: 'Times-Italic',
    color: '#475569',
    marginTop: 8,
    letterSpacing: 1.5,
  },
  // Student Name
  studentName: {
    fontSize: 28,
    fontFamily: 'Times-Bold',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  nameUnderline: {
    width: '50%',
    height: 1.5,
    backgroundColor: '#D97706',
    marginBottom: 14,
  },
  // Extended Matter / Body Text
  matterContainer: {
    width: '88%',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  matterParagraph: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 1.7,
    fontFamily: 'Times-Roman',
    marginBottom: 6,
  },
  courseHighlight: {
    fontSize: 15,
    fontFamily: 'Times-Bold',
    color: '#1D4ED8',
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    color: '#0F172A',
  },
  // Footer Section
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  footerColLeft: {
    width: '45%',
    alignItems: 'flex-start',
  },
  footerColRight: {
    width: '45%',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  signatureImage: {
    width: 110,
    height: 38,
    objectFit: 'contain',
    marginBottom: 2,
  },
  signatureLine: {
    borderTopWidth: 1.5,
    borderTopColor: '#0F172A',
    width: 160,
    alignItems: 'center',
    paddingTop: 4,
  },
  signatureTitle: {
    fontSize: 9,
    fontFamily: 'Times-Italic',
    color: '#475569',
    marginTop: 2,
  },
})

interface CertificatePDFProps {
  certificateNo: string
  studentName: string
  courseName: string
  durationMonths: number
  issueDate: string
  instituteName: string
  directorName: string
  directorSignatureUrl?: string | null
}

export function CertificatePDFDocument({
  certificateNo,
  studentName,
  courseName,
  durationMonths,
  issueDate,
  instituteName,
  directorName,
  directorSignatureUrl,
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            
            {/* Top Header */}
            <View style={styles.topHeader}>
              <Text style={styles.instituteTitle}>{instituteName}</Text>
              <Text style={styles.subtitle}>Autonomous Educational & Skill Development Institute</Text>

              {/* Decorative Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerDiamond} />
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Certificate Title */}
            <Text style={styles.certTitle}>Certificate of Completion</Text>
            <Text style={styles.presentationText}>This is to certify that</Text>

            {/* Student Name */}
            <Text style={styles.studentName}>{studentName}</Text>
            <View style={styles.nameUnderline} />

            {/* Extended Certificate Matter */}
            <View style={styles.matterContainer}>
              <Text style={styles.matterParagraph}>
                has successfully completed the comprehensive training program and coursework in{' '}
                <Text style={styles.courseHighlight}>{courseName}</Text> conducted at this Institute for a total duration of{' '}
                <Text style={styles.durationText}>{durationMonths} Month(s)</Text>.
              </Text>
              <Text style={styles.matterParagraph}>
                During the period of study, the candidate demonstrated exemplary academic performance, practical competence, and adherence to institutional standards. In recognition of the successful fulfillment of all curriculum requirements and evaluations, this Certificate of Completion is hereby conferred.
              </Text>
            </View>

            {/* Footer Section (No Seal) */}
            <View style={styles.footerRow}>
              {/* Left Column: Details */}
              <View style={styles.footerColLeft}>
                <Text style={styles.label}>Certificate No:</Text>
                <Text style={styles.value}>{certificateNo}</Text>
                <Text style={styles.label}>Issue Date:</Text>
                <Text style={styles.value}>{issueDate}</Text>
              </View>

              {/* Right Column: Signature */}
              <View style={styles.footerColRight}>
                {directorSignatureUrl && (
                  <Image src={directorSignatureUrl} style={styles.signatureImage} />
                )}
                <View style={styles.signatureLine}>
                  <Text style={{ fontSize: 12, fontFamily: 'Times-Bold', color: '#0F172A' }}>{directorName}</Text>
                  <Text style={styles.signatureTitle}>Director / Authorized Signatory</Text>
                </View>
              </View>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  )
}
