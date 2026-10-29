"""Local Pixel Art Fixer bridge. Input image bytes on stdin; JSON result on stdout."""
import base64, io, json, sys
try:
    import numpy as np
    from PIL import Image, ImageOps
    from pixelfixer import detect
    from pixelfixer.reconstruct import reconstruct
    raw = sys.stdin.buffer.read(20 * 1024 * 1024 + 1)
    if not raw or len(raw) > 20 * 1024 * 1024:
        raise ValueError("图片为空或超过 20 MB")
    im = Image.open(io.BytesIO(raw))
    if im.width < 8 or im.height < 8 or im.width * im.height > 12000000:
        raise ValueError("高质量恢复要求宽高至少 8px、总计不超过 1200 万像素")
    im = ImageOps.exif_transpose(im).convert("RGBA")
    rgba = np.array(im)
    result = detect(rgba)
    cols, rows = int(result["cols"]), int(result["rows"])
    if not (1 <= cols <= 512 and 1 <= rows <= 512):
        raise ValueError("检测到的原生网格超过 512px，请使用浏览器模式处理")
    restored = reconstruct(rgba, result["step_x"], result["step_y"], cols, rows)
    out = io.BytesIO()
    Image.fromarray(restored).save(out, format="PNG")
    print(json.dumps({"png":base64.b64encode(out.getvalue()).decode("ascii"),"width":cols,"height":rows,"stepX":round(float(result["step_x"]),2),"stepY":round(float(result["step_y"]),2)}))
except ImportError as exc:
    print("缺少 Python 图像处理依赖，请运行 python -m pip install -r tools/pixel-fixer/requirements.txt：" + str(exc), file=sys.stderr)
    sys.exit(1)
except Exception as exc:
    print(str(exc), file=sys.stderr)
    sys.exit(1)
