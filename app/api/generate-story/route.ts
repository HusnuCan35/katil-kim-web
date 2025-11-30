import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
        You are a master murder mystery writer. Create a unique, solvable murder mystery case for a 2-player co-op game.
        
        The output MUST be a valid JSON object matching this structure exactly. Do not include markdown formatting like \`\`\`json. Just the raw JSON.
        
        {
            "id": "generated-case-1",
            "title": "Case Title",
            "intro": "Brief introduction to the crime scene.",
            "suspects": [
                {
                    "id": "s1",
                    "name": "Name",
                    "bio": "Short bio",
                    "detailed_bio": "Detailed background, secrets",
                    "motive": "Why they might have done it",
                    "relationships": [
                        { "target_id": "s2", "type": "Type", "description": "Description" }
                    ],
                    "dialogues": [
                        { "id": "q1", "text": "Question?", "response": "Answer" }
                    ]
                }
            ],
            "clues": [
                {
                    "id": "c1",
                    "title": "Clue Title",
                    "description": "Description",
                    "visible_to": "DETECTIVE_A" | "DETECTIVE_B" | "BOTH",
                    "is_locked": boolean,
                    "locked_with_code": "4-digit code if locked (optional)",
                    "type": "PHYSICAL" | "DOCUMENT" | "TESTIMONY"
                }
            ],
            "timeline_events": [
                {
                    "id": "t1",
                    "title": "Event Title",
                    "time": "HH:MM",
                    "description": "What happened",
                    "correct_order": 1
                }
            ],
            "evidence_combinations": [
                {
                    "id": "ec1",
                    "clue_id_1": "id of first clue",
                    "clue_id_2": "id of second clue",
                    "result_clue": {
                        "id": "new_clue_id",
                        "title": "Result Title",
                        "description": "Analysis result",
                        "visible_to": "BOTH",
                        "is_locked": false,
                        "type": "ANALYSIS"
                    }
                }
            ],
            "solution": {
                "killer_id": "s3",
                "killer_name": "Yeğen",
                "motive": "Kumar borçları yüzünden mirasa konmak istedi."
            }
        }

        Requirements:
        1. Create 4 suspects. One is the killer.
        2. Create at least 6 clues. Distribute them: 2 for DETECTIVE_A, 2 for DETECTIVE_B, 2 for BOTH.
        3. Create 4 timeline events that need to be ordered.
        4. Create 2 evidence combinations that reveal critical info.
        5. The mystery must be solvable by logic.
        6. Language: Turkish.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting if Gemini adds it despite instructions
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const caseData = JSON.parse(cleanJson);

        return NextResponse.json({ success: true, caseData });
    } catch (error) {
        console.error('AI Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 });
    }
}
