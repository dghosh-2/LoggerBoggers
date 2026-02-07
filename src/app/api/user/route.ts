import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'src/app/onboarding/data.md');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
  }
  return NextResponse.json({ message: 'No user data found' });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Create markdown content
    const markdownContent = `# User Profile
- **Age**: ${data.age || 'N/A'}
- **Location**: ${data.location || 'N/A'}
- **Risk Tolerance**: ${data.riskTolerance || 'N/A'}
- **Debt Profile**: ${data.debtProfile || 'N/A'}
- **Income Status**: ${data.incomeStatus || 'N/A'}
- **Additional Requests**: ${data.customRequest || 'N/A'}
- **Updated At**: ${new Date().toISOString()}
`;

    const filePath = path.join(process.cwd(), 'src/app/onboarding/data.md');

    // Ensure directory exists (though it should)
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, markdownContent, 'utf8');

    console.log('User data saved to data.md');
    return NextResponse.json({ message: 'User data saved successfully', path: filePath });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
