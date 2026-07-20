import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId parameter' }, { status: 400 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'CRITICAL: Service role key is unconfigured' }, { status: 500 });
    }

    // 1. Authenticate the client token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1] || searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized user authentication' }, { status: 401 });
    }

    // 2. Retrieve locked, immutable calculated_emissions and report details from carbon_audits directly
    const { data: audit, error: auditError } = await supabaseAdmin
      .from('carbon_audits')
      .select(`
        *,
        audit_reports (
          organization_name,
          baseline_year,
          reporting_year,
          commitment_statement,
          planned_reductions
        )
      `)
      .eq('id', auditId)
      .single();

    if (auditError || !audit) {
      console.error('Audit retrieval error:', auditError);
      return NextResponse.json({ error: 'Audit record not found' }, { status: 404 });
    }

    // Verify ownership of the audit record
    if (audit.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const calculatedEmissions = (audit.calculated_emissions as any) || {};
    const reportDetails = (audit.audit_reports as any) || {};

    // 3. Render and return a PDF stream using jsPDF
    const doc = new jsPDF();

    // Set page parameters & styles
    doc.setFont('helvetica');
    doc.setFontSize(22);
    doc.setTextColor(0, 109, 91); // Green branding color (#006D5B)
    doc.text('Carbon Reduction Plan', 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Compliant with UK PPN 06/21 Standard', 15, 26);
    doc.line(15, 30, 195, 30);

    // Organization Information
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('Organization Information', 15, 40);

    doc.setFont('helvetica', 'normal');
    doc.text(`Organization Name: ${reportDetails.organization_name || 'N/A'}`, 15, 48);
    doc.text(`Reporting Year: ${reportDetails.reporting_year || 'N/A'}`, 15, 55);
    doc.text(`Baseline Year: ${reportDetails.baseline_year || 'N/A'}`, 15, 62);

    // Emissions Summary
    doc.setFont('helvetica', 'bold');
    doc.text('Carbon Emissions Summary (tCO2e)', 15, 75);
    doc.line(15, 78, 195, 78);

    doc.setFont('helvetica', 'normal');
    const scope1 = calculatedEmissions.scope1?.total || 0;
    const scope2 = calculatedEmissions.scope2?.total || 0;
    const scope3 = calculatedEmissions.scope3?.total || 0;
    const totalEmissions = (Number(scope1) + Number(scope2) + Number(scope3)).toFixed(2);

    doc.text(`Scope 1 (Direct Emissions): ${Number(scope1).toFixed(2)} tCO2e`, 15, 86);
    doc.text(`Scope 2 (Indirect Grid Electricity): ${Number(scope2).toFixed(2)} tCO2e`, 15, 93);
    doc.text(`Scope 3 (Categories 4, 5, 6, 7 & 9): ${Number(scope3).toFixed(2)} tCO2e`, 15, 100);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 109, 91);
    doc.text(`Total Reporting Emissions: ${totalEmissions} tCO2e`, 15, 110);

    // Commitment Statement
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Commitment Statement', 15, 122);
    doc.setFont('helvetica', 'normal');
    const commitmentText = reportDetails.commitment_statement || 'No commitment statement provided.';
    const splitCommitment = doc.splitTextToSize(commitmentText, 180);
    doc.text(splitCommitment, 15, 130);

    // Planned Reductions
    doc.setFont('helvetica', 'bold');
    doc.text('Planned Reductions & NetZero Targets', 15, 170);
    doc.setFont('helvetica', 'normal');
    const reductionText = reportDetails.planned_reductions || 'No reduction plans supplied.';
    const splitReduction = doc.splitTextToSize(reductionText, 180);
    doc.text(splitReduction, 15, 178);

    // Forensic verification hash / footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Forensic Reference: ${auditId}`, 15, 275);
    doc.text(`Audit Snapshot Version: ${audit.factor_set_version}`, 15, 280);

    // Output PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=PPN_06_21_Carbon_Reduction_Plan_${auditId}.pdf`,
      },
    });
  } catch (error: any) {
    console.error('Server PDF Generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
