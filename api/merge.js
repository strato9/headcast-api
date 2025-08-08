// /api/merge.js
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import ffmpeg from 'fluent-ffmpeg';

export const config = {
  api: {
    bodyParser: false,
  },
};

// promise wrapper to handle formidable form parsing
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const blend = parseFloat(fields.blendValue || 0.3);
    const affirmationPath = files.affirmation?.[0]?.filepath || files.affirmation?.filepath;
    const musicPath = files.music?.[0]?.filepath || files.music?.filepath;

    if (!affirmationPath || !musicPath) {
      return res.status(400).json({
        error: 'Missing audio files',
        debug: { files, fields },
      });
    }

    const outputPath = path.join('/tmp', 'output.mp3'); // always use /tmp in Vercel

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(musicPath)
        .inputOptions([`-filter:a volume=${blend}`])
        .input(affirmationPath)
        .complexFilter([
          `[0:a]volume=${blend}[music]`,
          `[1:a][music]amix=inputs=2:duration=longest:dropout_transition=3[a]`
        ])
        .outputOptions(['-map [a]', '-c:a libmp3lame'])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    const mp3Buffer = fs.readFileSync(outputPath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="headcast.mp3"');
    res.send(mp3Buffer);
  } catch (e) {
    res.status(500).json({ error: 'ffmpeg processing failed', details: e.message });
  }
}

