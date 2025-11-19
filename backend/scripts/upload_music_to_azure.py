"""
Upload existing music files to Azure Blob Storage
"""
import asyncio
import logging
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.azure_storage import azure_storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def upload_music_files():
    """Upload all music files from local assets to Azure"""
    await azure_storage.initialize()

    # Define music directories
    music_base = Path("assets/music")
    categories = ["calm", "happy", "energetic", "generated"]

    uploaded_count = 0
    skipped_count = 0

    for category in categories:
        category_path = music_base / category

        if not category_path.exists():
            logger.warning(f"Directory not found: {category_path}")
            continue

        # Get all audio files
        audio_files = list(category_path.glob("*.wav")) + \
                     list(category_path.glob("*.mp3")) + \
                     list(category_path.glob("*.ogg")) + \
                     list(category_path.glob("*.m4a"))

        logger.info(f"\nProcessing {category}/ - Found {len(audio_files)} files")

        for file_path in audio_files:
            # Azure blob path: music/{category}/{filename}
            blob_path = f"music/{category}/{file_path.name}"

            # Check if already exists
            if await azure_storage.blob_exists(blob_path):
                logger.info(f"  ⏭  Skipped (exists): {blob_path}")
                skipped_count += 1
                continue

            # Read file
            with open(file_path, 'rb') as f:
                file_data = f.read()

            # Determine content type
            content_type = "audio/wav"
            if file_path.suffix == ".mp3":
                content_type = "audio/mpeg"
            elif file_path.suffix == ".ogg":
                content_type = "audio/ogg"
            elif file_path.suffix == ".m4a":
                content_type = "audio/mp4"

            # Upload to Azure
            success = await azure_storage.upload_file(
                blob_path,
                file_data,
                content_type
            )

            if success:
                logger.info(f"  ✓ Uploaded: {blob_path} ({len(file_data)} bytes)")
                uploaded_count += 1
            else:
                logger.error(f"  ✗ Failed: {blob_path}")

    logger.info(f"\n{'='*60}")
    logger.info(f"Upload Summary:")
    logger.info(f"  Uploaded: {uploaded_count} files")
    logger.info(f"  Skipped:  {skipped_count} files")
    logger.info(f"  Total:    {uploaded_count + skipped_count} files")
    logger.info(f"{'='*60}")

    await azure_storage.close()


if __name__ == "__main__":
    asyncio.run(upload_music_files())
