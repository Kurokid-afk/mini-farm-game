using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

[assembly: AssemblyTitle("UU小园更新器")]
[assembly: AssemblyDescription("UU小园 Windows 桌面版安全更新器")]
[assembly: AssemblyCompany("Kurokid-afk")]
[assembly: AssemblyProduct("UU小园更新器")]
[assembly: AssemblyVersion("2.5.3.0")]
[assembly: AssemblyFileVersion("2.5.3.0")]

namespace UUFarmUpdater
{
    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            string explicitTarget = ArgumentValue(args, "--target");
            bool silentAuto = HasArgument(args, "--silent-auto");
            if (!string.IsNullOrWhiteSpace(explicitTarget) || silentAuto)
            {
                string target = explicitTarget;
                if (string.IsNullOrWhiteSpace(target))
                {
                    SearchResult search = UpdaterEngine.FindExistingGame();
                    target = search.OldVersionPath;
                }
                if (string.IsNullOrWhiteSpace(target)) return 2;
                UpdateResult result = UpdaterEngine.ReplaceExecutable(target);
                return result.Success ? 0 : 3;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UpdaterForm());
            return 0;
        }

        private static bool HasArgument(string[] args, string name)
        {
            foreach (string value in args)
            {
                if (string.Equals(value, name, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static string ArgumentValue(string[] args, string name)
        {
            for (int index = 0; index + 1 < args.Length; index++)
            {
                if (string.Equals(args[index], name, StringComparison.OrdinalIgnoreCase)) return args[index + 1];
            }
            return null;
        }
    }

    internal sealed class UpdaterForm : Form
    {
        private readonly Label statusLabel;
        private readonly TextBox pathBox;
        private readonly ProgressBar progress;
        private readonly Button updateButton;
        private readonly Button chooseButton;
        private readonly Button searchButton;
        private string targetPath;

        internal UpdaterForm()
        {
            Text = "UU小园更新器";
            ClientSize = new Size(620, 330);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            StartPosition = FormStartPosition.CenterScreen;
            MaximizeBox = false;
            Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Regular, GraphicsUnit.Point);
            BackColor = Color.FromArgb(236, 248, 244);
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

            Panel header = new Panel();
            header.Location = new Point(0, 0);
            header.Size = new Size(620, 92);
            header.BackColor = Color.FromArgb(211, 239, 231);
            Controls.Add(header);

            Label title = new Label();
            title.AutoSize = true;
            title.Location = new Point(28, 18);
            title.Font = new Font("Microsoft YaHei UI", 20F, FontStyle.Bold, GraphicsUnit.Point);
            title.ForeColor = Color.FromArgb(45, 75, 69);
            title.Text = "UU小园更新器";
            header.Controls.Add(title);

            Label version = new Label();
            version.AutoSize = true;
            version.Location = new Point(31, 59);
            version.ForeColor = Color.FromArgb(62, 132, 103);
            version.Text = "更新到 v" + UpdaterEngine.PayloadVersion;
            header.Controls.Add(version);

            Label safety = new Label();
            safety.Location = new Point(28, 110);
            safety.Size = new Size(564, 42);
            safety.ForeColor = Color.FromArgb(65, 89, 84);
            safety.Text = "只替换旧版游戏程序，不会删除金币、农田、宠物或小游戏进度。更新前请先退出游戏。";
            Controls.Add(safety);

            statusLabel = new Label();
            statusLabel.Location = new Point(28, 157);
            statusLabel.Size = new Size(564, 24);
            statusLabel.Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Bold, GraphicsUnit.Point);
            statusLabel.ForeColor = Color.FromArgb(45, 75, 69);
            statusLabel.Text = "正在查找旧版游戏...";
            Controls.Add(statusLabel);

            pathBox = new TextBox();
            pathBox.Location = new Point(28, 187);
            pathBox.Size = new Size(564, 28);
            pathBox.ReadOnly = true;
            pathBox.BackColor = Color.White;
            pathBox.ForeColor = Color.FromArgb(65, 89, 84);
            Controls.Add(pathBox);

            progress = new ProgressBar();
            progress.Location = new Point(28, 223);
            progress.Size = new Size(564, 7);
            progress.Style = ProgressBarStyle.Marquee;
            progress.MarqueeAnimationSpeed = 24;
            Controls.Add(progress);

            searchButton = CreateButton("重新查找", 28, 253, 118, Color.White, Color.FromArgb(45, 75, 69));
            searchButton.Click += delegate { BeginSearch(); };
            Controls.Add(searchButton);

            chooseButton = CreateButton("选择旧版 EXE", 158, 253, 150, Color.White, Color.FromArgb(45, 75, 69));
            chooseButton.Click += delegate { ChooseTarget(); };
            Controls.Add(chooseButton);

            updateButton = CreateButton("更新到 v" + UpdaterEngine.PayloadVersion, 386, 253, 206, Color.FromArgb(239, 119, 111), Color.White);
            updateButton.Enabled = false;
            updateButton.Click += delegate { BeginUpdate(); };
            Controls.Add(updateButton);

            Shown += delegate { BeginSearch(); };
        }

        private static Button CreateButton(string text, int x, int y, int width, Color backColor, Color foreColor)
        {
            Button button = new Button();
            button.Location = new Point(x, y);
            button.Size = new Size(width, 46);
            button.FlatStyle = FlatStyle.Flat;
            button.FlatAppearance.BorderColor = Color.FromArgb(118, 153, 144);
            button.FlatAppearance.BorderSize = 1;
            button.BackColor = backColor;
            button.ForeColor = foreColor;
            button.Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Bold, GraphicsUnit.Point);
            button.Text = text;
            button.UseVisualStyleBackColor = false;
            return button;
        }

        private void SetBusy(bool busy)
        {
            progress.Style = busy ? ProgressBarStyle.Marquee : ProgressBarStyle.Blocks;
            progress.MarqueeAnimationSpeed = busy ? 24 : 0;
            searchButton.Enabled = !busy;
            chooseButton.Enabled = !busy;
            updateButton.Enabled = !busy && !string.IsNullOrWhiteSpace(targetPath);
        }

        private async void BeginSearch()
        {
            targetPath = null;
            pathBox.Text = "";
            statusLabel.Text = "正在查找旧版游戏...";
            SetBusy(true);
            SearchResult result = await Task.Run(delegate { return UpdaterEngine.FindExistingGame(); });
            targetPath = result.OldVersionPath;
            if (!string.IsNullOrWhiteSpace(targetPath))
            {
                pathBox.Text = targetPath;
                statusLabel.Text = "已找到旧版，退出游戏后可以安全更新";
            }
            else if (!string.IsNullOrWhiteSpace(result.LatestVersionPath))
            {
                pathBox.Text = result.LatestVersionPath;
                statusLabel.Text = "这台电脑上的游戏已经是 v" + UpdaterEngine.PayloadVersion;
            }
            else
            {
                statusLabel.Text = "没有自动找到旧版，请选择原来的游戏 EXE";
            }
            SetBusy(false);
        }

        private void ChooseTarget()
        {
            using (OpenFileDialog dialog = new OpenFileDialog())
            {
                dialog.Title = "选择原来的 UU小园游戏 EXE";
                dialog.Filter = "UU小园游戏 (*.exe)|*.exe";
                dialog.CheckFileExists = true;
                dialog.Multiselect = false;
                if (dialog.ShowDialog(this) != DialogResult.OK) return;
                if (!UpdaterEngine.LooksLikeGame(dialog.FileName))
                {
                    MessageBox.Show(this, "这个文件不像 UU小园游戏，请选择原来的游戏 EXE。", "无法识别", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                if (UpdaterEngine.IsPayload(dialog.FileName))
                {
                    targetPath = null;
                    pathBox.Text = dialog.FileName;
                    statusLabel.Text = "这个文件已经是 v" + UpdaterEngine.PayloadVersion;
                    SetBusy(false);
                    return;
                }
                targetPath = dialog.FileName;
                pathBox.Text = targetPath;
                statusLabel.Text = "已选择旧版，退出游戏后可以安全更新";
                SetBusy(false);
            }
        }

        private async void BeginUpdate()
        {
            if (string.IsNullOrWhiteSpace(targetPath)) return;
            statusLabel.Text = "正在安全替换游戏程序...";
            SetBusy(true);
            UpdateResult result = await Task.Run(delegate { return UpdaterEngine.ReplaceExecutable(targetPath); });
            if (!result.Success)
            {
                statusLabel.Text = "更新未完成，原来的游戏文件保持不变";
                SetBusy(false);
                MessageBox.Show(this, result.Message, "更新失败", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            statusLabel.Text = "更新完成，原有本地进度保持不变";
            pathBox.Text = result.TargetPath;
            targetPath = null;
            SetBusy(false);
            DialogResult launch = MessageBox.Show(this, "已更新到 v" + UpdaterEngine.PayloadVersion + "。现在启动游戏吗？", "更新完成", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
            if (launch == DialogResult.Yes)
            {
                Process.Start(new ProcessStartInfo(result.TargetPath) { UseShellExecute = true });
                Close();
            }
        }
    }

    internal static class UpdaterEngine
    {
        internal const string PayloadVersion = "2.5.3";
        private const string PayloadResource = "UUFarmPayload";
        private const string HashResource = "UUFarmPayloadHash";
        private static readonly string[] KnownPrefixes = { "UU田园合集", "UU小园", "UU种菜", "UU Farm", "mini-farm-game" };
        private static readonly HashSet<string> SkippedDirectories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "$Recycle.Bin", "System Volume Information", "Windows", "Program Files", "Program Files (x86)",
            "ProgramData", "AppData", "node_modules", ".git", ".gradle", "Android", "Sdk"
        };

        internal static SearchResult FindExistingGame()
        {
            List<Candidate> oldVersions = new List<Candidate>();
            string latestVersion = null;
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            AddLocatorCandidate(oldVersions, seen, ref latestVersion);
            ScanRoot(AppDomain.CurrentDomain.BaseDirectory, 1, 0, 120, oldVersions, seen, ref latestVersion);

            string profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string downloads = Path.Combine(profile, "Downloads");
            ScanRoot(desktop, 4, 1, 5000, oldVersions, seen, ref latestVersion);
            ScanRoot(downloads, 4, 1, 5000, oldVersions, seen, ref latestVersion);
            ScanRoot(documents, 4, 1, 5000, oldVersions, seen, ref latestVersion);

            if (oldVersions.Count == 0 && string.IsNullOrWhiteSpace(latestVersion))
            {
                foreach (DriveInfo drive in DriveInfo.GetDrives())
                {
                    if (!drive.IsReady || drive.DriveType != DriveType.Fixed) continue;
                    ScanRoot(drive.RootDirectory.FullName, 5, 2, 24000, oldVersions, seen, ref latestVersion);
                    if (oldVersions.Count > 0) break;
                }
            }

            oldVersions.Sort(delegate(Candidate left, Candidate right)
            {
                int priority = left.Priority.CompareTo(right.Priority);
                if (priority != 0) return priority;
                return right.LastWriteTime.CompareTo(left.LastWriteTime);
            });
            return new SearchResult(oldVersions.Count > 0 ? oldVersions[0].Path : null, latestVersion);
        }

        internal static bool LooksLikeGame(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return false;
            string fullPath = Path.GetFullPath(path);
            if (string.Equals(fullPath, Application.ExecutablePath, StringComparison.OrdinalIgnoreCase)) return false;
            string name = Path.GetFileNameWithoutExtension(path);
            if (name.IndexOf("更新器", StringComparison.OrdinalIgnoreCase) >= 0
                || name.IndexOf("Updater", StringComparison.OrdinalIgnoreCase) >= 0) return false;
            if (LooksLikeKnownFileName(path)) return true;
            try
            {
                FileVersionInfo info = FileVersionInfo.GetVersionInfo(path);
                string product = info.ProductName ?? "";
                if (product.IndexOf("更新器", StringComparison.OrdinalIgnoreCase) >= 0
                    || product.IndexOf("Updater", StringComparison.OrdinalIgnoreCase) >= 0) return false;
                return product.IndexOf("UU", StringComparison.OrdinalIgnoreCase) >= 0
                    && (product.IndexOf("田园", StringComparison.OrdinalIgnoreCase) >= 0
                        || product.IndexOf("小园", StringComparison.OrdinalIgnoreCase) >= 0);
            }
            catch
            {
                return false;
            }
        }

        internal static bool IsPayload(string path)
        {
            try
            {
                return string.Equals(FileHash(path), PayloadHash(), StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        internal static UpdateResult ReplaceExecutable(string target)
        {
            string targetPath = Path.GetFullPath(target);
            if (!LooksLikeGame(targetPath)) return UpdateResult.Fail("没有识别到旧版 UU小园游戏。");
            if (IsPayload(targetPath)) return UpdateResult.Ok(targetPath, "已经是最新版。");

            string directory = Path.GetDirectoryName(targetPath);
            string temporary = Path.Combine(directory, "." + Path.GetFileName(targetPath) + ".uufarm-new");
            string backup = Path.Combine(directory, "." + Path.GetFileName(targetPath) + ".uufarm-backup");
            try
            {
                EnsureTargetIsClosed(targetPath);
                ExtractPayload(temporary);
                if (!string.Equals(FileHash(temporary), PayloadHash(), StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidDataException("更新文件校验失败，请重新下载更新器。");
                }
                if (File.Exists(backup)) File.Delete(backup);
                File.Move(targetPath, backup);
                try
                {
                    File.Move(temporary, targetPath);
                }
                catch
                {
                    if (File.Exists(targetPath)) File.Delete(targetPath);
                    File.Move(backup, targetPath);
                    throw;
                }
                TryDelete(backup);
                WriteLocator(targetPath);
                return UpdateResult.Ok(targetPath, "更新完成。");
            }
            catch (UnauthorizedAccessException)
            {
                RestoreIfNeeded(targetPath, backup);
                return UpdateResult.Fail("没有权限替换这个文件。请把更新器移到游戏同一文件夹，或以管理员身份运行。");
            }
            catch (IOException)
            {
                RestoreIfNeeded(targetPath, backup);
                return UpdateResult.Fail("旧版游戏正在运行或文件被占用。请完全退出游戏和托盘图标后再更新。");
            }
            catch (Exception error)
            {
                RestoreIfNeeded(targetPath, backup);
                return UpdateResult.Fail(error.Message);
            }
            finally
            {
                TryDelete(temporary);
            }
        }

        private static void AddLocatorCandidate(List<Candidate> oldVersions, HashSet<string> seen, ref string latestVersion)
        {
            try
            {
                string locator = LocatorPath();
                if (!File.Exists(locator)) return;
                string path = File.ReadAllText(locator, Encoding.UTF8).Trim();
                AddCandidate(path, 0, oldVersions, seen, ref latestVersion);
            }
            catch
            {
            }
        }

        private static void ScanRoot(
            string root,
            int maxDepth,
            int priority,
            int maxDirectories,
            List<Candidate> oldVersions,
            HashSet<string> seen,
            ref string latestVersion)
        {
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return;
            Queue<DirectoryDepth> queue = new Queue<DirectoryDepth>();
            queue.Enqueue(new DirectoryDepth(root, 0));
            int visited = 0;
            while (queue.Count > 0 && visited < maxDirectories)
            {
                DirectoryDepth current = queue.Dequeue();
                visited++;
                try
                {
                    foreach (string file in Directory.EnumerateFiles(current.Path, "*.exe", SearchOption.TopDirectoryOnly))
                    {
                        if (LooksLikeKnownFileName(file)) AddCandidate(file, priority, oldVersions, seen, ref latestVersion);
                    }
                    if (current.Depth >= maxDepth) continue;
                    foreach (string directory in Directory.EnumerateDirectories(current.Path, "*", SearchOption.TopDirectoryOnly))
                    {
                        if (SkippedDirectories.Contains(Path.GetFileName(directory))) continue;
                        queue.Enqueue(new DirectoryDepth(directory, current.Depth + 1));
                    }
                }
                catch
                {
                }
            }
        }

        private static void AddCandidate(
            string path,
            int priority,
            List<Candidate> oldVersions,
            HashSet<string> seen,
            ref string latestVersion)
        {
            if (!LooksLikeGame(path)) return;
            string fullPath = Path.GetFullPath(path);
            if (!seen.Add(fullPath)) return;
            if (IsPayload(fullPath))
            {
                if (string.IsNullOrWhiteSpace(latestVersion)) latestVersion = fullPath;
                return;
            }
            oldVersions.Add(new Candidate(fullPath, priority, File.GetLastWriteTimeUtc(fullPath)));
        }

        private static void EnsureTargetIsClosed(string path)
        {
            using (FileStream stream = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
            {
            }
        }

        private static void ExtractPayload(string path)
        {
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResource))
            {
                if (source == null) throw new InvalidDataException("更新器没有携带完整游戏文件。");
                using (FileStream target = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    source.CopyTo(target);
                    target.Flush(true);
                }
            }
        }

        private static string PayloadHash()
        {
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(HashResource))
            {
                if (stream == null) throw new InvalidDataException("更新器缺少校验信息。");
                using (StreamReader reader = new StreamReader(stream, Encoding.ASCII))
                {
                    return reader.ReadToEnd().Trim();
                }
            }
        }

        private static string FileHash(string path)
        {
            using (SHA256 sha = SHA256.Create())
            using (FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                byte[] hash = sha.ComputeHash(stream);
                StringBuilder value = new StringBuilder(hash.Length * 2);
                foreach (byte item in hash) value.Append(item.ToString("X2"));
                return value.ToString();
            }
        }

        private static string LocatorPath()
        {
            string overridePath = Environment.GetEnvironmentVariable("UU_UPDATER_LOCATOR");
            if (!string.IsNullOrWhiteSpace(overridePath)) return overridePath;
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            return Path.Combine(local, "UU小园", "install-path.txt");
        }

        private static void WriteLocator(string targetPath)
        {
            try
            {
                string locator = LocatorPath();
                Directory.CreateDirectory(Path.GetDirectoryName(locator));
                File.WriteAllText(locator, targetPath, new UTF8Encoding(false));
            }
            catch
            {
            }
        }

        private static bool LooksLikeKnownFileName(string path)
        {
            string name = Path.GetFileNameWithoutExtension(path);
            if (name.IndexOf("更新器", StringComparison.OrdinalIgnoreCase) >= 0
                || name.IndexOf("Updater", StringComparison.OrdinalIgnoreCase) >= 0) return false;
            foreach (string prefix in KnownPrefixes)
            {
                if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static void RestoreIfNeeded(string targetPath, string backup)
        {
            try
            {
                if (!File.Exists(targetPath) && File.Exists(backup)) File.Move(backup, targetPath);
            }
            catch
            {
            }
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
            }
        }
    }

    internal sealed class SearchResult
    {
        internal readonly string OldVersionPath;
        internal readonly string LatestVersionPath;

        internal SearchResult(string oldVersionPath, string latestVersionPath)
        {
            OldVersionPath = oldVersionPath;
            LatestVersionPath = latestVersionPath;
        }
    }

    internal sealed class UpdateResult
    {
        internal readonly bool Success;
        internal readonly string TargetPath;
        internal readonly string Message;

        private UpdateResult(bool success, string targetPath, string message)
        {
            Success = success;
            TargetPath = targetPath;
            Message = message;
        }

        internal static UpdateResult Ok(string targetPath, string message)
        {
            return new UpdateResult(true, targetPath, message);
        }

        internal static UpdateResult Fail(string message)
        {
            return new UpdateResult(false, null, message);
        }
    }

    internal sealed class Candidate
    {
        internal readonly string Path;
        internal readonly int Priority;
        internal readonly DateTime LastWriteTime;

        internal Candidate(string path, int priority, DateTime lastWriteTime)
        {
            Path = path;
            Priority = priority;
            LastWriteTime = lastWriteTime;
        }
    }

    internal sealed class DirectoryDepth
    {
        internal readonly string Path;
        internal readonly int Depth;

        internal DirectoryDepth(string path, int depth)
        {
            Path = path;
            Depth = depth;
        }
    }
}
