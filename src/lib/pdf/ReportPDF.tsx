import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  instituteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  instituteSubtitle: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'right',
  },
  dateRange: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'right',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    padding: 6,
    marginBottom: 10,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statBox: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
  },
  statLabel: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  },
})

interface ReportPDFProps {
  instituteName: string
  dateFrom: string
  dateTo: string
  totalAdmissions: number
  totalFees: number
  paidFees: number
  pendingFees: number
  collectionRate: number
  totalAttendance: number
  presentCount: number
  attendanceRate: number
}

export function ReportPDFDocument({
  instituteName,
  dateFrom,
  dateTo,
  totalAdmissions,
  totalFees,
  paidFees,
  pendingFees,
  collectionRate,
  totalAttendance,
  presentCount,
  attendanceRate,
}: ReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.instituteTitle}>{instituteName}</Text>
            <Text style={styles.instituteSubtitle}>Institute Management System — Executive Report</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>ANALYTICS REPORT</Text>
            <Text style={styles.dateRange}>
              Period: {dateFrom} to {dateTo}
            </Text>
          </View>
        </View>

        {/* Section 1: Admissions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. ADMISSIONS SUMMARY</Text>
          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Admissions</Text>
              <Text style={styles.statValue}>{totalAdmissions}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Fee Collections */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. FINANCIAL & FEE SUMMARY</Text>
          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Fees Assessed</Text>
              <Text style={styles.statValue}>Rs. {totalFees.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Collected</Text>
              <Text style={[styles.statValue, { color: '#166534' }]}>Rs. {paidFees.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pending Balance</Text>
              <Text style={[styles.statValue, { color: '#991B1B' }]}>Rs. {pendingFees.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={[styles.statBox, { width: '100%', marginTop: 4 }]}>
            <Text style={styles.statLabel}>Fee Collection Rate</Text>
            <Text style={styles.statValue}>{collectionRate}%</Text>
          </View>
        </View>

        {/* Section 3: Attendance */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. ATTENDANCE SUMMARY</Text>
          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Attendance Days</Text>
              <Text style={styles.statValue}>{totalAttendance}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Present Records</Text>
              <Text style={[styles.statValue, { color: '#166534' }]}>{presentCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Overall Attendance Rate</Text>
              <Text style={styles.statValue}>{attendanceRate}%</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by {instituteName} Management System</Text>
          <Text style={styles.footerText}>Date: {new Date().toLocaleDateString('en-IN')}</Text>
        </View>
      </Page>
    </Document>
  )
}
