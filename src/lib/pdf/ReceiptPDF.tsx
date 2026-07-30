import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 15,
    marginBottom: 20,
  },
  instituteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  instituteSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'right',
  },
  receiptNo: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailGroup: {
    width: '48%',
  },
  label: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  col1: { width: '50%', fontSize: 10, color: '#334155' },
  col2: { width: '25%', fontSize: 10, color: '#334155', textAlign: 'center' },
  col3: { width: '25%', fontSize: 10, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  summaryBox: {
    alignSelf: 'flex-end',
    width: '40%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    marginTop: 2,
  },
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
    textAlign: 'center',
    fontSize: 9,
    color: '#94A3B8',
  },
})

interface ReceiptPDFProps {
  receiptNo: string
  paymentDate: string
  studentName: string
  admissionNo: string
  courseName: string
  amount: number
  paymentMethod: string
  totalFee: number
  paidFee: number
  remainingFee: number
  instituteName: string
}

export function ReceiptPDFDocument({
  receiptNo,
  paymentDate,
  studentName,
  admissionNo,
  courseName,
  amount,
  paymentMethod,
  totalFee,
  paidFee,
  remainingFee,
  instituteName,
}: ReceiptPDFProps) {
  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.instituteTitle}>{instituteName}</Text>
            <Text style={styles.instituteSub}>Fee Payment Receipt</Text>
          </View>
          <View>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <Text style={styles.receiptNo}>Receipt No: {receiptNo}</Text>
            <Text style={styles.receiptNo}>Date: {paymentDate}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailGroup}>
            <Text style={styles.label}>Student Name</Text>
            <Text style={styles.value}>{studentName}</Text>
            <Text style={styles.label}>Admission No</Text>
            <Text style={styles.value}>{admissionNo}</Text>
          </View>
          <View style={styles.detailGroup}>
            <Text style={styles.label}>Course Enrolled</Text>
            <Text style={styles.value}>{courseName}</Text>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{paymentMethod.toUpperCase()}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Payment Mode</Text>
            <Text style={styles.col3}>Amount Paid (INR)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Tuition & Course Fee</Text>
            <Text style={styles.col2}>{paymentMethod.toUpperCase()}</Text>
            <Text style={styles.col3}>Rs. {amount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total Course Fee:</Text>
            <Text style={{ fontSize: 10, color: '#334155' }}>Rs. {totalFee.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total Paid:</Text>
            <Text style={{ fontSize: 10, color: '#166534', fontWeight: 'bold' }}>Rs. {paidFee.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#991B1B' }}>Remaining Dues:</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#991B1B' }}>Rs. {remainingFee.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a computer-generated receipt. Thank you for choosing {instituteName}.
        </Text>
      </Page>
    </Document>
  )
}
