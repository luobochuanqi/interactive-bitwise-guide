import os
from PIL import Image


def batch_convert_image(input_path, output_dir, resolutions, formats):
    """
    将指定的 PNG 图片转换为多种分辨率和格式。

    参数:
        input_path (str): 输入 PNG 图片的完整路径。
        output_dir (str): 输出图片的文件夹路径。
        resolutions (list of tuples): 目标分辨率列表，例如 [(1920, 1080), (800, 600)]。
        formats (list of str): 目标格式列表，例如 ['JPEG', 'WEBP', 'PNG']。
    """
    # 检查输入文件是否存在
    if not os.path.exists(input_path):
        print(f"错误：找不到输入文件 '{input_path}'")
        return

    # 确保输出目录存在，如果不存在则创建
    os.makedirs(output_dir, exist_ok=True)

    # 提取不带后缀的文件名 (例如从 'test.png' 提取 'test')
    base_name = os.path.splitext(os.path.basename(input_path))[0]

    try:
        # 打开原始图片
        with Image.open(input_path) as img:
            print(
                f"成功打开图片: {input_path} (原始尺寸: {img.size}, 模式: {img.mode})"
            )

            # 遍历所有设定的分辨率
            for size in resolutions:
                # 使用 LANCZOS 算法进行高质量重采样缩放
                resized_img = img.resize(size, Image.Resampling.LANCZOS)

                # 遍历所有设定的格式
                for fmt in formats:
                    # 构造输出文件名 (例如: test_1920x1080.jpg)
                    extension = "jpg" if fmt.upper() == "JPEG" else fmt.lower()
                    output_filename = f"{base_name}_{size[0]}x{size[1]}.{extension}"
                    output_path = os.path.join(output_dir, output_filename)

                    # 核心逻辑：处理透明度 (Alpha通道)
                    # JPEG 和 BMP 不支持透明背景。如果直接保存包含透明度的 PNG 会报错。
                    if fmt.upper() in ["JPEG", "JPG", "BMP"]:
                        if resized_img.mode in ("RGBA", "LA", "P"):
                            # 创建一张纯白背景的 RGB 图像
                            background = Image.new(
                                "RGB", resized_img.size, (255, 255, 255)
                            )

                            # 如果原图有 Alpha 通道，使用它作为遮罩粘贴，这样透明部分会变成白色
                            if resized_img.mode == "RGBA":
                                background.paste(
                                    resized_img, mask=resized_img.split()[3]
                                )
                            else:
                                background.paste(resized_img)

                            background.save(output_path, fmt.upper())
                            print(f"已保存: {output_filename}")
                            continue  # 继续下一次循环

                    # 对于支持透明度的格式 (如 PNG, WEBP, GIF) 或者原图本身没有透明度的情况
                    # 直接保存即可
                    resized_img.save(output_path, fmt.upper())
                    print(f"已保存: {output_filename}")

    except Exception as e:
        print(f"处理图片时发生错误: {e}")


# ==========================================
# 脚本配置与运行入口
# ==========================================
if __name__ == "__main__":
    # 1. 你的输入 PNG 图片路径 (请替换为你的实际图片路径)
    INPUT_FILE = "xxx"

    # 2. 输出文件夹的名称 (脚本会自动创建)
    OUTPUT_DIRECTORY = "converted_images"

    # 3. 你需要的各种目标分辨率 (宽度, 高度)
    TARGET_RESOLUTIONS = [
        (1920, 1080),  # 1080p
        (1280, 720),  # 720p
        (800, 600),  # Web 常用
        (256, 256),  # 大图标
        (64, 64),  # 小图标
        (32, 32),  # 小小图标
    ]

    # 4. 你需要的各种目标格式 (Pillow 支持的格式，通常全大写)
    TARGET_FORMATS = ["JPEG", "WEBP", "PNG", "BMP", "GIF", "ICO"]

    print("开始批量转换图片...")
    print("-" * 30)

    batch_convert_image(
        input_path=INPUT_FILE,
        output_dir=OUTPUT_DIRECTORY,
        resolutions=TARGET_RESOLUTIONS,
        formats=TARGET_FORMATS,
    )

    print("-" * 30)
    print("转换完成！")
