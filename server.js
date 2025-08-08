// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();

// Multer in-memory storage (we'll write to /tmp for ffmpeg)
const upload = multer({ storage: multer.memoryStorage() });

// Simple health check
app.get('/', (_req, res) => {
  res.status(200).send('HeadCast API is alive');
});

app.post('/merge', upload.fields([{ name: 'affirmation' }, { name: 'music' }]), async (req, res) => {
  console.log('--- /merge hit ---');
  try {
    const blendStr = req.body?.blendValue ?? '0.3';
    const blend = parseFloat(blendStr) || 0.3;
    console.log('blendValue:', blendStr, '->', blend);

    const affirmationFile = req.files?.affirmation?.[0];
    const musicFile = req.files?.music?.[0];

    console.log('files received:', {
      affirmation: !!affirmationFile && { size: affirmationFile.size, mimetype: affirmationFile.mimetype },
      music: !!musicFile && { size: musicFile.size, mimetype: musicFile.mimetype },
    });

    if (!affirmationFile || !musicFile) {
      console.log('Missing files');
      return res.status(400).json({ error: 'Missing audio files. Expect fields "affirmation" and "music".' });
    }

const affPath = path.join('/tmp', `affirmation_${Date.now()}.caf`);
const musPath = path.join('/tmp', `music_${Date.now()}.mp3`);
const outPath = path.join('/tmp', `headcast_${Date.now()}.mp3`);

    fs.writeFileSync(affPath, affirmationFile.buffer);
    fs.writeFileSync(musPath, musicFile.buffer);
    console.log('Wrote temp files:', { affPath, musPath });

console.log('Affirmation file:', affPath, 'exists:', fs.existsSync(affPath), 'size:', fs.statSync(affPath).size);
console.log('Music file:', musPath, 'exists:', fs.existsSync(musPath), 'size:', fs.statSync(musPath).size);


    await new Promise((resolve, reject) => {
      const proc = ffmpeg()
        .input(musPath)
        .input(affPath)
        .complexFilter([
          `[0:a]volume=${blend}[music]`,
          `[1:a][music]amix=inputs=2:duration=longest:dropout_transition=3[a]`
        ])
        .outputOptions(['-map [a]'])
        .on('start', cmd => console.log('ffmpeg start:', cmd))
        .on('progress', p => console.log('ffmpeg progress:', p))
        .on('stderr', line => console.log('ffmpeg stderr:', line))
        .on('end', () => {
          console.log('ffmpeg end');
          resolve();
        })
        .on('error', err => {
          console.error('ffmpeg error:', err.message);
          reject(err);
        });

      proc.save(outPath);
    });

    console.log('Reading output:', outPath);
    const mp3Buffer = fs.readFileSync(outPath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="headcast.mp3"');
    res.send(mp3Buffer);

    // cleanup (best effort)
    try { fs.unlinkSync(affPath); } catch {}
    try { fs.unlinkSync(musPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}
    console.log('Cleanup done.');
  } catch (e) {
    console.error('Handler error:', e);
    res.status(500).json({ error: 'ffmpeg processing failed', details: e.message });
  }
});


// Render sets PORT; default to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HeadCast API listening on port ${PORT}`);
});

