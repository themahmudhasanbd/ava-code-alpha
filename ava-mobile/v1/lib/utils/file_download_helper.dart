import 'package:flutter/material.dart';
import '../services/agent_core_service.dart';
import 'app_toast.dart';
import 'downloader/file_downloader.dart';

/// Cross-platform In-App File Download Helper for AvA Code
class FileDownloadHelper {
  /// Download a single file by its full server path
  static Future<bool> downloadSingleFile({
    required BuildContext context,
    required AvaAgentCoreService agentCoreService,
    required String fullPath,
    required String fileName,
  }) async {
    try {
      final rawUrl = agentCoreService.getRawFileUrl(fullPath);
      final downloadUrl = rawUrl.contains('?') ? '$rawUrl&download=true' : '$rawUrl?download=true';

      if (context.mounted) {
        AppToast.info(context, 'Downloading $fileName...');
      }

      final success = await FileDownloader.downloadFromUrl(
        url: downloadUrl,
        fileName: fileName,
        headers: agentCoreService.authHeaders,
      );

      if (context.mounted) {
        if (success) {
          AppToast.success(context, 'Downloaded $fileName');
        } else {
          AppToast.error(context, 'Could not download $fileName');
        }
      }
      return success;
    } catch (err) {
      if (context.mounted) {
        AppToast.error(context, 'Download failed: $err');
      }
      return false;
    }
  }

  /// Download multiple files by archiving them on the server first, then downloading the bundle
  static Future<bool> downloadMultipleFilesAsZip({
    required BuildContext context,
    required AvaAgentCoreService agentCoreService,
    required String targetDirectory,
    required List<String> fileNames,
    String? zipName,
  }) async {
    if (fileNames.isEmpty) return false;

    if (fileNames.length == 1) {
      final singleName = fileNames.first;
      final fullPath = targetDirectory.endsWith('/')
          ? '$targetDirectory$singleName'
          : '$targetDirectory/$singleName';
      return downloadSingleFile(
        context: context,
        agentCoreService: agentCoreService,
        fullPath: fullPath,
        fileName: singleName,
      );
    }

    try {
      if (context.mounted) {
        AppToast.info(context, 'Preparing ${fileNames.length} files for download...');
      }

      final archiveResult = await agentCoreService.archiveFiles(
        targetDirectory: targetDirectory,
        fileNames: fileNames,
        archiveName: zipName ?? 'download_bundle_${DateTime.now().millisecondsSinceEpoch}.zip',
        format: 'zip',
      );

      if (archiveResult != null && archiveResult['status'] == 'ok') {
        final archivePath = archiveResult['archivePath']?.toString() ??
            (archiveResult['archiveName'] != null
                ? '$targetDirectory/${archiveResult['archiveName']}'
                : null);

        if (archivePath != null) {
          final rawUrl = agentCoreService.getRawFileUrl(archivePath);
          final downloadUrl = rawUrl.contains('?') ? '$rawUrl&download=true' : '$rawUrl?download=true';
          final zipFileName = archiveResult['archiveName']?.toString() ?? 'download_bundle.zip';

          final success = await FileDownloader.downloadFromUrl(
            url: downloadUrl,
            fileName: zipFileName,
            headers: agentCoreService.authHeaders,
          );

          if (context.mounted) {
            if (success) {
              AppToast.success(context, 'Downloaded $zipFileName');
            } else {
              AppToast.error(context, 'Could not start zip download');
            }
          }
          return success;
        }
      }

      if (context.mounted) {
        AppToast.error(context, 'Failed to create zip bundle for download');
      }
      return false;
    } catch (err) {
      if (context.mounted) {
        AppToast.error(context, 'Download error: $err');
      }
      return false;
    }
  }
}

